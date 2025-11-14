import { NextResponse } from "next/server";

export async function GET(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate a delay
  // The hard-coded "analysis"
  const mockAnalysisResult = {
    soilType: "Loamy Sand",
    composition: {
      Silica: "High",
      IronOxide: "Medium",
      Carbon: "Low",
      Magnesium: "Low",
    },
    habitability: {
      summary: "Challenging",
      details:
        "Based on this composition, this soil has low nutrient levels and would be challenging for growing food without significant additives.",
    },
  };

  // Return the mock data as a JSON response
  return NextResponse.json(mockAnalysisResult);
}
