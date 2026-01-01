import { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "server", "data");
const dataFile = path.join(dataDir, "options.json");

const defaultOptions = {
  bankNames: [
    "Attijariwafa bank",
    "BMCE Bank of Africa",
    "CIH Bank",
    "Banque Populaire",
    "Société Générale",
    "Crédit du Maroc",
    "BMCI",
    "Bank Al-Maghrib"
  ],
  appointmentTypes: [
    "Consultation Biohacking",
    "Thérapie IV",
    "Séance de Cryothérapie",
    "Analyse du Bilan Sanguin",
    "Consultation Bien-être",
    "Suivi Post-Traitement",
    "Thérapie par Ondes de Choc",
    "Consultation Nutritionnelle",
    "Examen Médical Complet",
    "Thérapie par la Lumière",
    "Consultation Hormonale",
    "Séance de Récupération",
  ],
  soinTypes: [
    "Consultation",
    "Diagnostic",
    "Préventif",
    "Thérapeutique",
    "Chirurgie",
    "Rééducation",
    "Urgence",
    "Suivi",
  ],
};

async function ensureDataFile() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify(defaultOptions, null, 2), "utf-8");
  }
}

async function readOptions() {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, "utf-8");
  const parsed = JSON.parse(raw);
  return {
    bankNames: Array.isArray(parsed.bankNames)
      ? parsed.bankNames
      : defaultOptions.bankNames,
    appointmentTypes: Array.isArray(parsed.appointmentTypes)
      ? parsed.appointmentTypes
      : defaultOptions.appointmentTypes,
    soinTypes: Array.isArray(parsed.soinTypes)
      ? parsed.soinTypes
      : defaultOptions.soinTypes,
  } as { bankNames: string[]; appointmentTypes: string[]; soinTypes: string[] };
}

async function writeOptions(options: {
  bankNames?: string[];
  appointmentTypes?: string[];
  soinTypes?: string[];
}) {
  const current = await readOptions();
  const next = {
    bankNames: options.bankNames ?? current.bankNames,
    appointmentTypes: options.appointmentTypes ?? current.appointmentTypes,
    soinTypes: options.soinTypes ?? current.soinTypes,
  };
  await fs.writeFile(dataFile, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export const getOptions: RequestHandler = async (_req, res) => {
  try {
    const options = await readOptions();
    res.json(options);
  } catch (err) {
    res.status(500).json({ message: "Impossible de lire les options" });
  }
};

export const updateOptions: RequestHandler = async (req, res) => {
  try {
    const { bankNames, appointmentTypes, soinTypes } = req.body || {};

    const sanitize = (arr: unknown) =>
      Array.isArray(arr)
        ? Array.from(
            new Set(
              arr
                .map((v) => (typeof v === "string" ? v.trim() : ""))
                .filter((v) => v.length > 0),
            ),
          )
        : undefined;

    const updated = await writeOptions({
      bankNames: sanitize(bankNames),
      appointmentTypes: sanitize(appointmentTypes),
      soinTypes: sanitize(soinTypes),
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Impossible de mettre à jour les options" });
  }
};
