import * as service from '../services/customer.service.js';

export const getAll = async (req, res, next) => {
  try {
    res.json(await service.getAllCustomers(req.query));
  } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const data = await service.getCustomerById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Customer not found' });
    res.json(data);
  } catch (e) { next(e); }
};
