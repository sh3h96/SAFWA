const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const routesDir = path.join(__dirname, 'routes');

// Create directories if they don't exist
if (!fs.existsSync(controllersDir)) fs.mkdirSync(controllersDir, { recursive: true });
if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });

const entities = [
  'user',
  'vehicle',
  'appointment',
  'technicalReport',
  'sparePart',
  'requiredPart',
  'invoice',
  'invoiceItem',
  'payment',
  'review'
];

entities.forEach(entity => {
  const controllerName = `${entity}Controller.js`;
  const routeName = `${entity}Routes.js`;
  
  const controllerPath = path.join(controllersDir, controllerName);
  const routePath = path.join(routesDir, routeName);

  const controllerContent = `// Empty controller for ${entity}
// We will fill this later based on frontend needs
module.exports = {

};
`;

  const routeContent = `const express = require('express');
const router = express.Router();
const ${entity}Controller = require('../controllers/${entity}Controller');

// Define routes for ${entity} here
// router.get('/', ${entity}Controller.getAll);

module.exports = router;
`;

  if (!fs.existsSync(controllerPath)) fs.writeFileSync(controllerPath, controllerContent);
  if (!fs.existsSync(routePath)) fs.writeFileSync(routePath, routeContent);
});

console.log('Successfully generated empty controller and router files.');
