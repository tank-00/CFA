# Drop your CFA Level 3 PDFs here

Place your PDF files in this folder, then edit `app/scripts/process-pdfs.ts`
to map each reading ID to its PDF filename.

## Naming convention (suggested)

```
topic-1-behavioral-finance.pdf
topic-2-capital-market-expectations.pdf
topic-3-asset-allocation.pdf
topic-4-fixed-income.pdf
topic-5-equity.pdf
topic-6-alternatives.pdf
topic-7-private-wealth.pdf
topic-8-institutional.pdf
topic-9-trading-performance.pdf
topic-10-cases.pdf
topic-11-ethics.pdf
```

One PDF per topic area works fine, or one per reading — your choice.
Then update READING_PDF_MAP in the script accordingly.

## Running the processor

```bash
cd app
npx tsx scripts/process-pdfs.ts
```
