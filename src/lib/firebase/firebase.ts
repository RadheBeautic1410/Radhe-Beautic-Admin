import firebaseConfig from './config';
import firebase from "firebase/compat/app";
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadString, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseApp = firebase.initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Function to upload invoice HTML to Firebase storage
export const uploadInvoiceToFirebase = async (invoiceHTML: string, batchNumber: string): Promise<string> => {
  try {
    // Create a reference to the invoice file in Firebase storage
    const invoiceRef = ref(storage, `invoices/${batchNumber}.html`);
    
    // Upload the HTML content as a string
    await uploadString(invoiceRef, invoiceHTML, 'raw');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(invoiceRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading invoice to Firebase:', error);
    throw new Error('Failed to upload invoice to Firebase storage');
  }
};

// Function to upload invoice PDF to Firebase storage
export const uploadInvoicePDFToFirebase = async (pdfBuffer: Buffer, batchNumber: string): Promise<string> => {
  try {
    // Create a reference to the invoice PDF file in Firebase storage
    const invoiceRef = ref(storage, `invoices/${batchNumber}.pdf`);
    
    // Upload the PDF buffer
    await uploadBytes(invoiceRef, pdfBuffer);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(invoiceRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading invoice PDF to Firebase:', error);
    throw new Error('Failed to upload invoice PDF to Firebase storage');
  }
};

// Function to delete invoice from Firebase storage
export const deleteInvoiceFromFirebase = async (batchNumber: string): Promise<void> => {
  try {
    // Create a reference to the invoice PDF file in Firebase storage
    const invoiceRef = ref(storage, `invoices/${batchNumber}.pdf`);
    
    // Delete the file
    await deleteObject(invoiceRef);
    
    console.log(`Invoice ${batchNumber}.pdf deleted from Firebase storage`);
  } catch (error) {
    console.error('Error deleting invoice from Firebase:', error);
    // Don't throw error as the file might not exist
  }
};

export default firebaseApp;