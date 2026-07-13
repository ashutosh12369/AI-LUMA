import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  name: String,
  content: String
}, { _id: false });

const sharedArtifactSchema = new mongoose.Schema({
  shareId: {
    type: String,
    required: true,
    unique: true
  },
  title: String,
  type: String,
  files: [fileSchema],
  createdBy: String
}, {
  timestamps: true
});

const SharedArtifact = mongoose.model("SharedArtifact", sharedArtifactSchema);
export default SharedArtifact;
