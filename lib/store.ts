import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import { setAutoFreeze } from "immer";
import userReducer from "./reducers/user";
import editorReducer from "./reducers/editor";
import profileReducer from "./reducers/profile";

// React Flow mutates node.width/height in place. Immer's auto-freeze must be off
// or those writes throw "Attempted to assign to readonly property".
setAutoFreeze(false);

const rootReducer = combineReducers({
  user: userReducer,
  editor: editorReducer,
  profile: profileReducer,
});

const persistConfig = {
  key: "rooted",
  storage,
  whitelist: ["user"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

const persistor = persistStore(store);

export { store, persistor };
