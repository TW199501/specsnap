declare module 'dom-to-image-more' {
  export interface Options {
    width?: number;
    height?: number;
    style?: Partial<CSSStyleDeclaration>;
    filter?: (node: Node) => boolean;
    bgcolor?: string;
    quality?: number;
    cacheBust?: boolean;
    imagePlaceholder?: string;
    pixelRatio?: number;
  }
  export function toBlob(node: Node, options?: Options): Promise<Blob>;
  export function toPng(node: Node, options?: Options): Promise<string>;
  export function toJpeg(node: Node, options?: Options): Promise<string>;
  export function toSvg(node: Node, options?: Options): Promise<string>;
  const _default: {
    toBlob: typeof toBlob;
    toPng: typeof toPng;
    toJpeg: typeof toJpeg;
    toSvg: typeof toSvg;
  };
  export default _default;
}
