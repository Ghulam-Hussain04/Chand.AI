import { NextResponse } from 'next/server';

// This function handles GET requests to /api/lunar
export async function GET(request: Request) {
  
  // Simulate the time it takes for the AI model to run
  await new Promise(resolve => setTimeout(resolve, 2000));

  // The hard-coded "analysis" for a lunar sample
  const mockLunarResult = {
    sampleType: "Lunar Regolith (Basalt)",
    composition: {
      "Silicon (Si)": "High",
      "Iron (Fe)": "Medium",
      "ALuminium (Al)": "Trace",
      "Water Ice (H₂O)": "None Detected"
    },
    habitability: {
      summary: "Inhospitable",
      details: "This sample is consistent with lunar regolith. It lacks organic matter and water, making it unsuitable for terrestrial life without significant life-support systems."
    }
  };

  // Return the mock data as a JSON response
  return NextResponse.json(mockLunarResult);
}