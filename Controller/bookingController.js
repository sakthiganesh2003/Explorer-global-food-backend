import { Maid } from "../Models/Maid.model";

export const getMaids = async (req, res) => {
  try {
    const maids = await Maid.find();
    res.status(200).json(maids);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch maids", error });
  }
};

export const addMaid = async (req, res) => {
  try {
    const maid = new Maid(req.body);
    await maid.save();
    res.status(201).json(maid);
  } catch (error) {
    res.status(400).json({ message: "Failed to add maid", error });
  }
};
