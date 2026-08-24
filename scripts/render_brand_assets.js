// Render brand SVGs to PNG from a JSON job list.
// Usage: node render_brand_assets.js jobs.json
//
// Each job: { src, out, width, background? }
// `background` composites the artwork over an opaque colour, for previews of
// transparent marks that are meant to sit on a dark surface.
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

for (const job of jobs) {
  let svg = fs.readFileSync(job.src, 'utf8');

  if (job.background) {
    const vb = svg.match(/viewBox="([^"]+)"/);
    const [x, y, w, h] = vb
      ? vb[1].trim().split(/[\s,]+/).map(Number)
      : [0, 0, 1024, 1024];
    const rect = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${job.background}"/>`;
    svg = svg.replace(/(<svg[^>]*>)/, `$1${rect}`);
  }

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: job.width } })
    .render()
    .asPng();

  fs.mkdirSync(path.dirname(job.out), { recursive: true });
  fs.writeFileSync(job.out, png);
  console.log(`  ${path.relative(process.cwd(), job.out)}`);
}
