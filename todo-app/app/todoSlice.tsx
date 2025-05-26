import { createSlice } from '@reduxjs/toolkit';

const todoSlice = createSlice({
  name: 'todo',
  initialState: {
    incompleteCount: 0,
  },
  reducers: {
    setIncompleteCount: (state, action) => {
      state.incompleteCount = action.payload;
    },
    increment: (state) => {
      state.incompleteCount += 1;
    },
    decrement: (state) => {
      if (state.incompleteCount > 0) state.incompleteCount -= 1;
    },
  },
});

export const { setIncompleteCount, increment, decrement } = todoSlice.actions;
export default todoSlice.reducer;