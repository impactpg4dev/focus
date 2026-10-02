// focus/src/pages/activity/tambah-identitas/TambahIdentitas.jsx
import React from 'react';
import IdentitasPage from './IdentitasPage';
import { FORM_MODE } from './constants';

const TambahIdentitas = () => <IdentitasPage mode={FORM_MODE.CREATE} />;

export default TambahIdentitas;