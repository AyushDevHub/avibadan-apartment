const prisma = require("../config/prisma");

// Single row, always id "singleton" — created lazily on first read/write.

async function getSettings(req, res) {
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  res.json(settings);
}

async function updateSettings(req, res) {
  const { qrCodeUrl, qrCodeNote } = req.body;
  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(qrCodeUrl !== undefined ? { qrCodeUrl } : {}),
      ...(qrCodeNote !== undefined ? { qrCodeNote } : {}),
    },
    create: { id: "singleton", qrCodeUrl, qrCodeNote },
  });
  res.json(settings);
}

module.exports = { getSettings, updateSettings };
