import { IFormProps } from "../formInterface/forms.model";

export interface ITinymceEditorProps extends IFormProps{
  autosavePrefix?: string;
  autoSaveInterval?: string;
  autosaveRetention?: string;
}