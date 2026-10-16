import { describe, expect, it } from "@jest/globals";
import { toIr } from "@marktwain/render";
import { parseMarkdown } from "@marktwain/schema";
import { PNG } from "./fixtures";
import { PLACEHOLDER_PATH, checkImages, looksLikeImage, placeholderPng } from "./images";

const document = (text: string, id = "d") => ({ id, document: toIr(parseMarkdown(text), { documentId: id, knownLabels: new Set() }).document });

describe("looksLikeImage", () => {
  it("accepts a real PNG and the grey box, and refuses a text file with the name of an image", () => {
    expect(looksLikeImage("a.png", PNG)).toBe(true);
    expect(looksLikeImage("a.png", placeholderPng())).toBe(true);
    expect(looksLikeImage("fake.png", new TextEncoder().encode("this is not a picture at all, just a line of text"))).toBe(false);
    expect(looksLikeImage("tiny.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]))).toBe(false);
    // A PNG that has a good header and then garbage, or is cut short, is not an image that can be decoded
    expect(looksLikeImage("cut.png", new Uint8Array(Buffer.from(PNG).subarray(0, 40)))).toBe(false);
    expect(looksLikeImage("junk.png", new Uint8Array(Buffer.concat([Buffer.from(PNG).subarray(0, 33), Buffer.from("garbage")])))).toBe(false);
    expect(looksLikeImage("a.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9]))).toBe(true);
    expect(looksLikeImage("cut.jpg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe(false);
    expect(looksLikeImage("a.jpg", new Uint8Array([1, 2, 3, 4, 5]))).toBe(false);
    expect(looksLikeImage("a.svg", new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(true);
    expect(looksLikeImage("a.svg", new TextEncoder().encode("hello"))).toBe(false);
  });
});

describe("checkImages", () => {
  it("finds a missing image and one that is not an image, with the block that holds each, and maps both to the grey box", () => {
    const written: string[] = [];
    const docs = [document("# 一\n\n![缺](images/gone.png)\n\n![好](images/ok.png)\n", "c1"), document("![假](images/fake.png)\n", "c2")];
    const { issues, replace } = checkImages({
      documents: docs,
      files: [
        { path: "images/ok.png", data: PNG },
        { path: "images/fake.png", data: new TextEncoder().encode("not a picture, only some text in a file") },
      ],
      write: (src) => written.push(src),
    });
    expect(issues).toEqual([
      { src: "images/gone.png", reason: "missing", documentId: "c1", block: 1 },
      { src: "images/fake.png", reason: "unreadable", documentId: "c2", block: 0 },
    ]);
    expect([...replace]).toEqual([
      ["images/gone.png", PLACEHOLDER_PATH],
      ["images/fake.png", PLACEHOLDER_PATH],
    ]);
    expect(written).toEqual([PLACEHOLDER_PATH]);
  });

  it("writes nothing when every image is fine", () => {
    const written: string[] = [];
    const { issues, replace } = checkImages({ documents: [document("![好](images/ok.png)\n")], files: [{ path: "images/ok.png", data: PNG }], write: (src) => written.push(src) });
    expect(issues).toEqual([]);
    expect(replace.size).toBe(0);
    expect(written).toEqual([]);
  });
});
