declare module "pdf-parse" {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }
  interface PDFPageProxy {
    getTextContent: (opts: { normalizeWhitespace: boolean; disableCombineTextItems: boolean }) => Promise<{
      items: { str: string; transform: number[] }[];
    }>;
  }
  interface PDFOptions {
    pagerender?: (pageData: PDFPageProxy) => Promise<string>;
    max?: number;
  }
  function pdfParse(buffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export default pdfParse;
}
