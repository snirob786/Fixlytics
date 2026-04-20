import { AnalyzerService } from "./analyzer.service";

describe("AnalyzerService", () => {
  const analyzer = new AnalyzerService();

  it("returns deterministic scores for the same inputs", () => {
    const payload = { mode: "fixture", snippet: "<title>x</title>", htmlLength: 1200 };
    const a = analyzer.analyze(payload, "https://example.com/a");
    const b = analyzer.analyze(payload, "https://example.com/a");
    expect(a.categoryScores).toEqual(b.categoryScores);
    expect(a.checks).toEqual(b.checks);
  });

  it("changes outputs when the lead URL changes", () => {
    const payload = { mode: "fixture", htmlLength: 1200 };
    const a = analyzer.analyze(payload, "https://example.com/a");
    const b = analyzer.analyze(payload, "https://example.com/b");
    expect(a.categoryScores.seo).not.toEqual(b.categoryScores.seo);
  });
});
