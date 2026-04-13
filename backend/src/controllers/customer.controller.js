import * as service from '../services/customer.service.js';
import { customerSchema } from '../validators/customer.validator.js';

export const searchByPhone = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.json(null);
    const customer = await service.findByPhone(phone);
    res.json(customer ? { customer } : null);
  } catch (e) { next(e); }
};

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

export const create = async (req, res, next) => {
  try {
    const body = customerSchema.parse(req.body);
    res.status(201).json(await service.createCustomer(body));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const body = customerSchema.partial().parse(req.body);
    res.json(await service.updateCustomer(req.params.id, body));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await service.deleteCustomer(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
};
