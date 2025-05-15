const express = require('express');
const { createStudentProfile, updateStudentProfile, deleteStudentProfile, getStudentProfile, getStudentProfileByUserId, updateStudentProfileByUserId } = require('../../Controller/user/userprofilecontroller');
const Router = express.Router();

Router.route('/')
  .post(createStudentProfile);

Router.route('/:id')
  .get(getStudentProfile)
  .patch(updateStudentProfile)
  .delete(deleteStudentProfile);

Router.get('/user/:userId', getStudentProfileByUserId);

Router.put('/user/:userId', updateStudentProfileByUserId);

module.exports = Router;