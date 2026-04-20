export const getHealth = (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "dayflow-backend",
    timestamp: new Date().toISOString()
  });
};
