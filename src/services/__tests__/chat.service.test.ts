import { chatService, ChatService } from '../chat.service';
import { mistralChatService } from '../mistral-chat.service';
import { mistralEmbedService } from '../mistral-embed.service';
import { lhmService } from '../lhm.service';
import { embeddingRepository } from '../../repositories/embedding.repository';
import profileRepository from '../../repositories/profile.repository';
import { Profile } from '../../types/domain.types';

// Mock dependencies
jest.mock('../mistral-chat.service');
jest.mock('../mistral-embed.service');
jest.mock('../lhm.service');
jest.mock('../../repositories/embedding.repository');
jest.mock('../../repositories/profile.repository');

describe('ChatService', () => {
  const mockUserId = 'user-123';
  const mockProfiles: Profile[] = [
    {
      id: 'profile-1',
      userId: mockUserId,
      name: 'John Doe',
      relationship: 'self',
      isDefault: true,
      createdAt: new Date(),
    },
    {
      id: 'profile-2',
      userId: mockUserId,
      name: 'Mary Doe',
      relationship: 'mother',
      isDefault: false,
      createdAt: new Date(),
    },
  ];

  const mockLHM = {
    profileId: 'profile-1',
    userId: mockUserId,
    markdown: '# Health Summary\n\nCurrent health status...',
    version: 1,
    lastUpdatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should stream response for valid question', async () => {
      // Setup mocks
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      
      const mockChunks = ['Hello', ' ', 'world'];
      async function* mockStream() {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      // Execute
      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is my health status?')) {
        chunks.push(chunk);
      }

      // Verify
      expect(chunks).toEqual(mockChunks);
      expect(profileRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(lhmService.getLHM).toHaveBeenCalledWith('profile-1');
      expect(mistralChatService.completeStream).toHaveBeenCalled();
    });

    it('should detect target profile from question', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      // Ask about mother
      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, "What is my mom's blood sugar?")) {
        chunks.push(chunk);
      }

      // Should fetch LHM for mother's profile
      expect(lhmService.getLHM).toHaveBeenCalledWith('profile-2');
    });

    it('should use provided profileId when specified', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      // Explicitly specify profile
      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is the health status?', {
        profileId: 'profile-2',
      })) {
        chunks.push(chunk);
      }

      expect(lhmService.getLHM).toHaveBeenCalledWith('profile-2');
    });

    it('should perform vector search when enabled', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      (mistralEmbedService.embed as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
      (embeddingRepository.similaritySearch as jest.Mock).mockResolvedValue([
        { chunkText: 'Relevant chunk 1' },
        { chunkText: 'Relevant chunk 2' },
      ]);
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is my cholesterol?', {
        useVectorSearch: true,
      })) {
        chunks.push(chunk);
      }

      expect(mistralEmbedService.embed).toHaveBeenCalledWith('What is my cholesterol?');
      expect(embeddingRepository.similaritySearch).toHaveBeenCalled();
    });

    it('should skip vector search when disabled', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is my health status?', {
        useVectorSearch: false,
      })) {
        chunks.push(chunk);
      }

      expect(mistralEmbedService.embed).not.toHaveBeenCalled();
      expect(embeddingRepository.similaritySearch).not.toHaveBeenCalled();
    });

    it('should continue without vector search if it fails', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      (mistralEmbedService.embed as jest.Mock).mockRejectedValue(
        new Error('Embedding failed')
      );
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is my health status?')) {
        chunks.push(chunk);
      }

      // Should still complete successfully
      expect(chunks).toEqual(['Response']);
      expect(mistralChatService.completeStream).toHaveBeenCalled();
    });

    it('should throw error when no profiles found', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      await expect(async () => {
        for await (const chunk of chatService.chat(mockUserId, 'What is my health status?')) {
          // Should not reach here
        }
      }).rejects.toThrow('No profiles found for user');
    });

    it('should throw error when profile detection fails', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);

      await expect(async () => {
        // Ask about a profile that doesn't exist
        for await (const chunk of chatService.chat(mockUserId, 'What about grandma?')) {
          // Should not reach here
        }
      }).rejects.toThrow();
    });

    it('should include LHM in system prompt', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is my health status?')) {
        chunks.push(chunk);
      }

      // Verify system prompt includes LHM
      const callArgs = (mistralChatService.completeStream as jest.Mock).mock.calls[0];
      const messages = callArgs[0];
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain(mockLHM.markdown);
    });

    it('should include relevant chunks in system prompt when vector search is used', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      (mistralEmbedService.embed as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
      (embeddingRepository.similaritySearch as jest.Mock).mockResolvedValue([
        { chunkText: 'Relevant chunk about cholesterol' },
      ]);
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is my cholesterol?', {
        useVectorSearch: true,
      })) {
        chunks.push(chunk);
      }

      // Verify system prompt includes relevant chunks
      const callArgs = (mistralChatService.completeStream as jest.Mock).mock.calls[0];
      const messages = callArgs[0];
      expect(messages[0].content).toContain('Relevant chunk about cholesterol');
    });

    it('should respect maxContextChunks option', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      (mistralEmbedService.embed as jest.Mock).mockResolvedValue([0.1, 0.2, 0.3]);
      (embeddingRepository.similaritySearch as jest.Mock).mockResolvedValue([
        { chunkText: 'Chunk 1' },
        { chunkText: 'Chunk 2' },
      ]);
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is my health status?', {
        maxContextChunks: 5,
      })) {
        chunks.push(chunk);
      }

      expect(embeddingRepository.similaritySearch).toHaveBeenCalledWith(
        'profile-1',
        expect.any(Array),
        5,
        0.7
      );
    });

    it('should include profile information in system prompt', async () => {
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(mockProfiles);
      (lhmService.getLHM as jest.Mock).mockResolvedValue(mockLHM);
      
      async function* mockStream() {
        yield 'Response';
      }
      (mistralChatService.completeStream as jest.Mock).mockReturnValue(mockStream());

      const chunks: string[] = [];
      for await (const chunk of chatService.chat(mockUserId, 'What is my health status?')) {
        chunks.push(chunk);
      }

      // Verify system prompt includes profile info
      const callArgs = (mistralChatService.completeStream as jest.Mock).mock.calls[0];
      const messages = callArgs[0];
      expect(messages[0].content).toContain('John Doe');
      expect(messages[0].content).toContain('self');
    });
  });
});
