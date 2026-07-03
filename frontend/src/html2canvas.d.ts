declare module 'html2canvas' {
  interface Html2canvasOptions {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string;
    logging?: boolean;
    imageTimeout?: number;
    width?: number;
    height?: number;
    windowWidth?: number;
    windowHeight?: number;
    onclone?: (clonedDoc: Document, clonedElement: HTMLElement) => void;
  }

  function html2canvas(element: HTMLElement, options?: Html2canvasOptions): Promise<HTMLCanvasElement>;
  export default html2canvas;
}
