import {createContext, useContext} from 'react';
import {AIModel} from "./models/model";

interface ModelsContextState {
  models: AIModel[];
  setModels: (models: AIModel[]) => void;
}

const ModelsContext = createContext<ModelsContextState>({
  models: [],
  setModels: () => {
  },
});

export const useModelsContext = () => useContext(ModelsContext);

export default ModelsContext;
