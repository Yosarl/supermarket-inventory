import { createSlice } from '@reduxjs/toolkit';

const savedCompanyId = localStorage.getItem('selectedCompanyId');
const savedFinancialYearId = localStorage.getItem('selectedFinancialYearId');

interface AppState {
  selectedCompanyId: string | null;
  selectedFinancialYearId: string | null;
}

const initialState: AppState = {
  selectedCompanyId: savedCompanyId,
  selectedFinancialYearId: savedFinancialYearId,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setCompany: (state, action) => {
      state.selectedCompanyId = action.payload;
      if (action.payload) localStorage.setItem('selectedCompanyId', action.payload);
      else localStorage.removeItem('selectedCompanyId');
    },
    setFinancialYear: (state, action) => {
      state.selectedFinancialYearId = action.payload;
      if (action.payload) localStorage.setItem('selectedFinancialYearId', action.payload);
      else localStorage.removeItem('selectedFinancialYearId');
    },
  },
});

export const { setCompany, setFinancialYear } = appSlice.actions;
export default appSlice.reducer;
