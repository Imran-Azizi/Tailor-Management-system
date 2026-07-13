import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { generateCategoryAppearance } from "../lib/itemCategoryDefaults.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function buildCategoryPayload(body, { partial = false } = {}) {
  const name = normalizeText(body.name);
  const description =
    body.description !== undefined
      ? normalizeText(body.description) || null
      : undefined;
  const isActive =
    body.isActive !== undefined ? Boolean(body.isActive) : undefined;
  const sortOrder =
    body.sortOrder !== undefined ? Number(body.sortOrder) : undefined;

  if (!partial && !name) {
    const err = new Error("Category name is required.");
    err.status = 400;
    throw err;
  }

  if (sortOrder !== undefined && (!Number.isInteger(sortOrder) || sortOrder < 0)) {
    const err = new Error("Sort order must be a valid whole number.");
    err.status = 400;
    throw err;
  }

  const data = {};
  if (name) data.name = name;
  if (description !== undefined) data.description = description;
  if (isActive !== undefined) data.isActive = isActive;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  return data;
}

async function assignGeneratedAppearance(data) {
  const existingCount = await prisma.itemCategory.count();
  const appearance = generateCategoryAppearance(data.name, { existingCount });

  return {
    ...data,
    iconKey: appearance.iconKey,
    color: appearance.color,
  };
}

export async function listCategories(req, res, next) {
  try {
    const includeInactive = String(req.query.includeInactive || "") === "true";
    const where = includeInactive ? {} : { isActive: true };

    const categories = await prisma.itemCategory.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true, accountType: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    res.json({ categories });
  } catch (error) {
    next(error);
  }
}

export async function getCategory(req, res, next) {
  try {
    const category = await prisma.itemCategory.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true, accountType: true } },
      },
    });
    if (!category) return res.status(404).json({ error: "Category not found." });
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const data = await assignGeneratedAppearance(buildCategoryPayload(req.body));
    const category = await prisma.itemCategory.create({
      data: { ...data, createdById: req.user.id },
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true, accountType: true } },
      },
    });
    res.status(201).json(category);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      error.status = 409;
      error.message = "A category with this name already exists.";
    }
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const data = buildCategoryPayload(req.body, { partial: true });
    const category = await prisma.itemCategory.update({
      where: { id: req.params.id },
      data,
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true, accountType: true } },
      },
    });
    res.json(category);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      error.status = 409;
      error.message = "A category with this name already exists.";
    }
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const category = await prisma.itemCategory.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { items: true } } },
    });
    if (!category) return res.status(404).json({ error: "Category not found." });

    const salesCount = await prisma.itemSale.count({
      where: { categoryId: category.id },
    });

    if (category._count.items > 0 || salesCount > 0) {
      return res.status(409).json({
        error:
          "Cannot delete this category because it has related items or sales records.",
      });
    }

    await prisma.itemCategory.delete({ where: { id: category.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
