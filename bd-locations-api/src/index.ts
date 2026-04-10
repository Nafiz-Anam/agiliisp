import express from "express";
import cors from "cors";
import { divisions } from "./data/locations";

const app = express();
const PORT = process.env.PORT || 4100;

app.use(cors());
app.use(express.json());

// ── GET /api/divisions — list all divisions
app.get("/api/divisions", (_req, res) => {
  res.json({
    data: divisions.map((d) => ({ name: d.name, nameBn: d.nameBn })),
  });
});

// ── GET /api/divisions/:name — get a division with its districts
app.get("/api/divisions/:name", (req, res) => {
  const div = divisions.find(
    (d) => d.name.toLowerCase() === req.params.name.toLowerCase()
  );
  if (!div) return res.status(404).json({ error: "Division not found" });
  res.json({
    data: {
      name: div.name,
      nameBn: div.nameBn,
      districts: div.districts.map((d) => d.name),
    },
  });
});

// ── GET /api/districts/:name — get a district with all thanas
app.get("/api/districts/:name", (req, res) => {
  for (const div of divisions) {
    const dist = div.districts.find(
      (d) => d.name.toLowerCase() === req.params.name.toLowerCase()
    );
    if (dist) {
      // Merge regular thanas + metro thanas
      const allThanas = [
        ...(dist.metroThanas || []).map((t) => ({
          name: t.name,
          type: "metro" as const,
          areas: t.areas,
        })),
        ...dist.thanas.map((t) => ({
          name: t.name,
          type: "upazila" as const,
          areas: t.areas,
        })),
      ];
      return res.json({
        data: {
          division: div.name,
          district: dist.name,
          thanas: allThanas,
        },
      });
    }
  }
  res.status(404).json({ error: "District not found" });
});

// ── GET /api/thanas/:district/:thana — get areas for a specific thana
app.get("/api/thanas/:district/:thana", (req, res) => {
  for (const div of divisions) {
    const dist = div.districts.find(
      (d) => d.name.toLowerCase() === req.params.district.toLowerCase()
    );
    if (dist) {
      const allThanas = [...(dist.metroThanas || []), ...dist.thanas];
      const thana = allThanas.find(
        (t) => t.name.toLowerCase() === req.params.thana.toLowerCase()
      );
      if (thana) {
        return res.json({
          data: {
            division: div.name,
            district: dist.name,
            thana: thana.name,
            areas: thana.areas,
          },
        });
      }
    }
  }
  res.status(404).json({ error: "Thana not found" });
});

// ── GET /api/search?q=khalishpur — search across all levels
app.get("/api/search", (req, res) => {
  const q = ((req.query.q as string) || "").toLowerCase().trim();
  if (!q || q.length < 2) return res.json({ data: [] });

  const results: Array<{
    type: string;
    name: string;
    division?: string;
    district?: string;
    thana?: string;
  }> = [];

  for (const div of divisions) {
    if (div.name.toLowerCase().includes(q)) {
      results.push({ type: "division", name: div.name });
    }
    for (const dist of div.districts) {
      if (dist.name.toLowerCase().includes(q)) {
        results.push({
          type: "district",
          name: dist.name,
          division: div.name,
        });
      }
      const allThanas = [...(dist.metroThanas || []), ...dist.thanas];
      for (const thana of allThanas) {
        if (thana.name.toLowerCase().includes(q)) {
          results.push({
            type: "thana",
            name: thana.name,
            division: div.name,
            district: dist.name,
          });
        }
        for (const area of thana.areas) {
          if (area.toLowerCase().includes(q)) {
            results.push({
              type: "area",
              name: area,
              division: div.name,
              district: dist.name,
              thana: thana.name,
            });
          }
        }
      }
    }
  }

  res.json({ data: results.slice(0, 50) });
});

// ── GET /api/stats — dataset statistics
app.get("/api/stats", (_req, res) => {
  let districtCount = 0;
  let thanaCount = 0;
  let areaCount = 0;

  for (const div of divisions) {
    districtCount += div.districts.length;
    for (const dist of div.districts) {
      const allThanas = [...(dist.metroThanas || []), ...dist.thanas];
      thanaCount += allThanas.length;
      for (const thana of allThanas) {
        areaCount += thana.areas.length;
      }
    }
  }

  res.json({
    data: {
      divisions: divisions.length,
      districts: districtCount,
      thanas: thanaCount,
      areas: areaCount,
    },
  });
});

app.listen(PORT, () => {
  console.log(`BD Locations API running on http://localhost:${PORT}`);
  console.log("Endpoints:");
  console.log("  GET /api/divisions");
  console.log("  GET /api/divisions/:name");
  console.log("  GET /api/districts/:name");
  console.log("  GET /api/thanas/:district/:thana");
  console.log("  GET /api/search?q=...");
  console.log("  GET /api/stats");
});
