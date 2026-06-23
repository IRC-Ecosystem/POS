const express = require("express");
const managerController = require("../controllers/managerController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/manager", requireRole("manager"), managerController.index);
router.get("/manager/api-integrator", requireRole("manager"), managerController.apiIntegrator);
router.get("/manager/api-integrator/local", requireRole("manager"), managerController.localApiIntegrator);
router.get("/manager/api-integrator/:provider", requireRole("manager"), managerController.providerApiIntegrator);
router.post("/manager/api-integrator/:provider/endpoints", requireRole("manager"), managerController.createExternalApiEndpoint);
router.post("/manager/api-integrator/:provider/endpoints/:id/update", requireRole("manager"), managerController.updateExternalApiEndpoint);
router.post("/manager/api-integrator/:provider/endpoints/:id/activate", requireRole("manager"), managerController.activateExternalApiEndpoint);
router.post("/manager/api-integrator/:provider/endpoints/:id/delete", requireRole("manager"), managerController.deleteExternalApiEndpoint);
router.get("/manager/api-spec.json", requireRole("manager"), managerController.exportApiSpec);
router.get("/manager/api-health.json", requireRole("manager"), managerController.checkApiHealth);
router.get("/manager/export/csv", requireRole("manager"), managerController.exportCsv);
router.get("/manager/export/pdf", requireRole("manager"), managerController.exportPdf);

module.exports = router;
