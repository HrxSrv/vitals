// Living Health Markdown template for new profiles
// Follows the structure defined in docs/lhm.md
export const LHM_SKELETON_TEMPLATE = `# Health Report — {{name}}

**Last Updated:** {{lastUpdated}}
**Reports on File:** 0
**Last Checkup:** No reports uploaded yet
**Next Checkup Recommended:** Upload your first report to get started

---

## Patient Profile
- **Age:** {{age}}
- **Gender:** {{gender}}
- **Blood Group:** Not available
- **Known Conditions:** Not available (will be inferred from reports)
- **Medications:** Not available
- **Allergies:** Not available

---

## Current Health Snapshot
*No reports uploaded yet. Upload your first health checkup PDF to see your snapshot here.*

---

## Historical Trends
*Trends will appear after 2+ reports are uploaded.*

---

## Key Observations & Concerns
*Will be generated after first report is processed.*

---

## Report Log
*No reports yet.*
`;

// Prompt for first report merge
export const LHM_FIRST_REPORT_PROMPT = `You are a health report system. You maintain a structured markdown health document for each user.

Here is the user's CURRENT health markdown:
---
{{currentLHM}}
---

The user has just uploaded their first report. Here is the extracted data:
- Report Date: {{reportDate}}
- Biomarkers: {{biomarkers}}

Your task:
1. Fill in the "Current Health Snapshot" tables — categorize each biomarker as 🔴 Needs Attention, 🟡 Borderline, or 🟢 Normal based on ref ranges
   - 🔴 Needs Attention: value is outside reference range (high or low)
   - 🟡 Borderline: value is within 10% of reference range boundary
   - 🟢 Normal: value is within reference range
2. Set Trend to "→ New" since this is the first data point
3. Create the first row in each relevant "Historical Trends" panel (group by category: Diabetes Panel, Kidney Panel, Liver Panel, Lipid Panel, Thyroid Panel, Blood Count, etc.)
4. Write "Key Observations & Concerns" — plain English, non-medical-jargon, 2-3 sentences per observation
5. Infer any "Known Conditions" from the data if obvious (e.g., HbA1c > 6.5 → likely diabetic, TSH abnormal → thyroid condition)
6. Update the "Report Log" table with this first report
7. Update metadata (Last Updated to today, Reports on File to 1, Last Checkup to report date, Next Checkup Recommended to 6 months from report date)

IMPORTANT:
- Maintain the EXACT markdown structure/format shown in the current LHM
- Do NOT remove any sections, even if empty
- Use the exact table column headers as shown: | Parameter | Value | Unit | Ref Range | Status | Trend |
- Keep observations concise (2-3 sentences each)
- Never diagnose. Use phrases like "suggests", "may indicate", "consider discussing with your doctor"
- For Historical Trends tables, use format: | Date | Lab | Parameter1 | Parameter2 | ... |
- Add an "Observation:" line after each Historical Trends table

Return the COMPLETE updated markdown document.`;

// Prompt for subsequent report merges
export const LHM_MERGE_PROMPT = `You are a health report system. You maintain a structured markdown health document for each user.

Here is the user's CURRENT health markdown:
---
{{currentLHM}}
---

The user has uploaded a NEW report. Here is the extracted data:
- Report Date: {{reportDate}}
- Biomarkers: {{biomarkers}}

Your task — MERGE this new data into the existing document:

1. **Current Health Snapshot:**
   - Update ALL parameter values to reflect the LATEST available data
   - Recategorize (🔴/🟡/🟢) based on new values:
     * 🔴 Needs Attention: outside reference range
     * 🟡 Borderline: within 10% of range boundary
     * 🟢 Normal: within reference range
   - Update Trend column by comparing new value with previous:
     * ↑ Worsening (moving further from normal)
     * ↓ Improving (moving toward normal)
     * → Stable (minimal change, < 5% difference)
     * If a parameter is new (not seen before), set trend to "→ New"

2. **Historical Trends:**
   - ADD a new row to each relevant panel table (do NOT replace old rows)
   - Keep the most recent 10 entries per panel, summarize older ones if needed
   - If a new panel category appears (e.g., first time Vitamin D is tested), create a new panel section
   - Update the panel "Observation" text based on the full trend (2-3 sentences)

3. **Key Observations & Concerns:**
   - Rewrite this section entirely based on ALL available data
   - Highlight any significant changes from previous report
   - Flag any parameter that has crossed from normal to abnormal
   - Note improvements as well as deteriorations
   - Prioritize by severity (critical issues first)
   - Use plain English, avoid medical jargon

4. **Report Log:** Add the new report as the top entry (most recent first)

5. **Metadata:** 
   - Update Last Updated to today
   - Increment Reports on File count
   - Update Last Checkup to new report date
   - Update Next Checkup Recommended (6 months from latest report)

6. **Patient Profile:** Update "Known Conditions" if new evidence supports adding a condition

CRITICAL RULES:
- NEVER delete historical data from trend tables
- NEVER change previously recorded values
- Keep the EXACT markdown structure
- If a biomarker from a previous report is NOT in the new report, keep its last known value in the snapshot but note "(from {date})" in the Trend column
- Use exact table format: | Date | Lab | Parameter1 | Parameter2 | ... |
- Add "Observation:" after each Historical Trends table

Return the COMPLETE updated markdown document.`;
