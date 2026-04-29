import * as service from "../services/box.service.js";
import { z } from "zod";

const BOX_TYPE_VALUES = [
  "OUTFIT",
  "WASKAT",
  "KORTY",
  "YAKHANQAQ",
  "FOREIGN_COUNTRY",
];

const boxSchema = z.object({
  boxName: z.string().min(1),
  boxType: z.enum(BOX_TYPE_VALUES),
  capacity: z.number().int().min(1),
});

export const getAll = async (req, res, next) => {
  try {
    const type =
      typeof req.query.type === "string" ? req.query.type : undefined;
    res.json(await service.getAllBoxes({ type }));
  } catch (e) {
    next(e);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const data = await service.getBoxById(req.params.id);
    if (!data) return res.status(404).json({ error: "Box not found" });
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const body = boxSchema.parse(req.body);
    res.status(201).json(await service.createBox(body));
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const body = boxSchema.partial().parse(req.body);
    res.json(await service.updateBox(req.params.id, body));
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    await service.deleteBox(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const assignOrder = async (req, res, next) => {
  try {
    const { orderId, boxId } = req.body;
    const targetBoxId = boxId === null ? null : req.params.id;
    res.json(await service.assignOrderToBox(orderId, targetBoxId));
  } catch (e) {
    next(e);
  }
};
