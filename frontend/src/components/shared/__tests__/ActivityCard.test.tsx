import { render, screen } from "@testing-library/react";
import { ActivityCard } from "../ActivityCard";
import { BrowserRouter } from "react-router-dom";
import type { Activity } from "@/types/domain";
import { RegionLabels } from "@/types/domain";

// Enum strings as they are inferred from schemas (Zod enums are basically strings at runtime)
// But using "as const" or just the string value is fine if the type matches.
// We use the string literals here.
const mockActivity: Activity = {
  id: "1",
  title: "Test Activity",
  category: "action",
  estPricePerPerson: 50,
  locationRegion: "OOE",
  imageUrl: "http://test.com/img.jpg",
  shortDescription: "Short desc",
  season: "summer",
  riskLevel: "medium",
  tags: [],
  // Adding fields that might be required by the Schema-derived type (optional in Schema, but good to be safe)
  rating: 4.5,
  reviewCount: 10
};

describe("ActivityCard", () => {
  it("renders title and price correctly", () => {
    render(
      <BrowserRouter>
        <ActivityCard activity={mockActivity} />
      </BrowserRouter>
    );
    expect(screen.getByText("Test Activity")).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("renders with optional fields missing", () => {
    const minimalActivity: Activity = {
      id: "2",
      slug: "minimal-activity",
      title: "Minimal Activity",
      category: "action",
      tags: [],
      locationRegion: "OOE",
      estPricePerPerson: 0,
      shortDescription: "Short desc",
      imageUrl: "http://test.com/img2.jpg",
      season: "summer",
      riskLevel: "low",
      groupSizeMin: 1,
      groupSizeMax: 5,
      physicalIntensity: 1,
      mentalChallenge: 1,
      socialInteractionLevel: 1
    };

    render(
      <BrowserRouter>
        <ActivityCard activity={minimalActivity} />
      </BrowserRouter>
    );

    expect(screen.getByText("Minimal Activity")).toBeInTheDocument();
    expect(screen.getByText(RegionLabels.OOE)).toBeInTheDocument();
    expect(screen.getByText(/ab 0/)).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
