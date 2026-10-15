import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "redux";
import userReducer from "./reducers/user";
import editorReducer from "./reducers/editor";
import profileReducer from "./reducers/profile";
import { configureStore } from "@reduxjs/toolkit";

const rootReducer = combineReducers({
  user: userReducer,
  editor: editorReducer,
  profile: profileReducer,
});

const persistConfig = {
  key: "rooted",
  storage,
  // Persist only lightweight identity — trees/images load from Mongo
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
