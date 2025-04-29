const Joi = require('joi');

const chefSchema = Joi.object({
  name: Joi.string().required(),
  experienceYears: Joi.number().min(0).max(50).required(),
  specialty: Joi.string().valid('Pastry', 'Italian', 'Asian', 'Vegan').required(),
  agreeToTerms: Joi.boolean().valid(true).required(),
});

module.exports = { chefSchema };