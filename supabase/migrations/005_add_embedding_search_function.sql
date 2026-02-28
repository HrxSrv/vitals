-- Migration: Add vector similarity search function for embeddings
-- This function enables efficient similarity search using pgvector

-- Create function to search embeddings by cosine similarity
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding TEXT,
  query_profile_id UUID,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  report_id UUID,
  user_id UUID,
  profile_id UUID,
  chunk_text TEXT,
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ,
  distance FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    report_embeddings.id,
    report_embeddings.report_id,
    report_embeddings.user_id,
    report_embeddings.profile_id,
    report_embeddings.chunk_text,
    report_embeddings.embedding,
    report_embeddings.created_at,
    (report_embeddings.embedding <=> query_embedding::VECTOR(1024)) AS distance
  FROM report_embeddings
  WHERE 
    report_embeddings.profile_id = query_profile_id
    AND (report_embeddings.embedding <=> query_embedding::VECTOR(1024)) < match_threshold
  ORDER BY distance ASC
  LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION search_embeddings IS 'Performs cosine similarity search on report embeddings for a specific profile';
