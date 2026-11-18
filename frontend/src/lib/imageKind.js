const cache = new Map();

export const getKind = (src) => cache.get(src) ?? null;
export const rememberKind = (src, kind) => cache.set(src, kind);

export function classifyImage(img) {
  try {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);

    // sample points all the way round the edge of the picture
    const points = [];
    for (let i = 0; i < size; i += 3) points.push([i, 0], [i, size - 1], [0, i], [size - 1, i]);

    let alphaSum = 0;
    const lums = [];
    for (const [x, y] of points) {
      const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
      alphaSum += a;
      lums.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
    }
    const alpha = alphaSum / points.length;
    const avg = lums.reduce((s, v) => s + v, 0) / lums.length;
    const spread = Math.max(...lums) - Math.min(...lums); // how uniform the edge is

    if (alpha < 215) return "cutout";
    if (spread < 40 && avg > 218) return "light";
    if (spread < 28 && avg < 40) return "dark";
    return "photo";
  } catch {
    return "photo"; // couldn't read the pixels
  }
}
