export type Company = {
  id: number;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  industry: string;
  coordinates?: [number, number];
  travelTimes?: Record<string, { walkMinutes: number | null; driveMinutes: number | null }>;
};

export const companies: Company[] = [
  {
    "id": 1,
    "name": "RAITEC - Linz",
    "address": "Goethestr. 80",
    "postalCode": "4040",
    "city": "Linz",
    "industry": "IT",
    "coordinates": [
      48.299256,
      14.307186
    ],
    "travelTimes": {
      "1": {
        "walkMinutes": 37,
        "driveMinutes": 9
      },
      "2": {
        "walkMinutes": 15,
        "driveMinutes": 4
      },
      "3": {
        "walkMinutes": 19,
        "driveMinutes": 4
      },
      "4": {
        "walkMinutes": 15,
        "driveMinutes": 4
      },
      "5": {
        "walkMinutes": 108,
        "driveMinutes": 18
      },
      "6": {
        "walkMinutes": 90,
        "driveMinutes": 17
      },
      "7": {
        "walkMinutes": 23,
        "driveMinutes": 5
      },
      "8": {
        "walkMinutes": 91,
        "driveMinutes": 16
      },
      "9": {
        "walkMinutes": 83,
        "driveMinutes": 15
      },
      "10": {
        "walkMinutes": 31,
        "driveMinutes": 9
      },
      "11": {
        "walkMinutes": 25,
        "driveMinutes": 7
      },
      "12": {
        "walkMinutes": 23,
        "driveMinutes": 5
      },
      "13": {
        "walkMinutes": 40,
        "driveMinutes": 8
      },
      "14": {
        "walkMinutes": 5,
        "driveMinutes": 2
      },
      "15": {
        "walkMinutes": 14,
        "driveMinutes": 4
      },
      "16": {
        "walkMinutes": null,
        "driveMinutes": 5
      },
      "17": {
        "walkMinutes": 23,
        "driveMinutes": 5
      },
      "18": {
        "walkMinutes": 59,
        "driveMinutes": 13
      },
      "19": {
        "walkMinutes": 24,
        "driveMinutes": 6
      },
      "20": {
        "walkMinutes": 106,
        "driveMinutes": 18
      },
      "21": {
        "walkMinutes": 22,
        "driveMinutes": 6
      },
      "22": {
        "walkMinutes": null,
        "driveMinutes": 6
      },
      "23": {
        "walkMinutes": 26,
        "driveMinutes": 7
      },
      "24": {
        "walkMinutes": 55,
        "driveMinutes": null
      },
      "25": {
        "walkMinutes": 20,
        "driveMinutes": 6
      },
      "26": {
        "walkMinutes": 56,
        "driveMinutes": null
      },
      "27": {
        "walkMinutes": 11,
        "driveMinutes": 3
      },
      "28": {
        "walkMinutes": 24,
        "driveMinutes": null
      },
      "29": {
        "walkMinutes": 92,
        "driveMinutes": 16
      },
      "30": {
        "walkMinutes": null,
        "driveMinutes": null
      },
      "31": {
        "walkMinutes": null,
        "driveMinutes": null
      },
      "32": {
        "walkMinutes": 35,
        "driveMinutes": 7
      },
      "33": {
        "walkMinutes": 49,
        "driveMinutes": 10
      },
      "34": {
        "walkMinutes": 21,
        "driveMinutes": 6
      },
      "35": {
        "walkMinutes": 26,
        "driveMinutes": 6
      },
      "36": {
        "walkMinutes": 22,
        "driveMinutes": 6
      },
      "37": {
        "walkMinutes": 1,
        "driveMinutes": 1
      },
      "38": {
        "walkMinutes": 1,
        "driveMinutes": 1
      },
      "39": {
        "walkMinutes": 1,
        "driveMinutes": 1
      },
      "40": {
        "walkMinutes": 1,
        "driveMinutes": 1
      }
    }
  }
];

export const getCompanyById = (id?: number | null) =>
  typeof id === "number" ? companies.find((company) => company.id === id) : undefined;

export const searchCompanies = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return companies.filter((company) => {
    return (
      company.name.toLowerCase().includes(normalized) ||
      company.city.toLowerCase().includes(normalized) ||
      company.industry.toLowerCase().includes(normalized) ||
      company.address.toLowerCase().includes(normalized) ||
      company.postalCode.includes(normalized)
    );
  });
};
