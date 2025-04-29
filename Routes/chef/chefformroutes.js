// Routes/chef/chefformroutes.js
const express = require('express');
const { upload } = require('../../Config/cloudinary');
const { registerChef , getAllChefs , deleteChef } = require('../../Controller/chef/chefformcontroller');

const router = express.Router();

// Route for chef registration with file upload
router.post('/register', upload.single('certificationFile'), registerChef);

// GET: Retrieve all chefs
 router.get("/", getAllChefs);

 router.delete("/:id", deleteChef);

// GET: Retrieve a chef by ID
// router.get("/:id", getChefById);

module.exports = router;