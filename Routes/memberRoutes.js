const express = require('express');
const { 
  getMembers, 
  addMember, 
  deleteMember 
} = require('../Controller/memberController');

const router = express.Router();

router.get('/', getMembers);
router.post('/', addMember);
router.delete('/:id', deleteMember);

module.exports = router;