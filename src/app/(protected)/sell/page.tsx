"use client";

import { RoleGateForComponent } from '@/src/components/auth/role-gate-component';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { UserRole } from '@prisma/client';
import axios from 'axios';
import { Loader2, Search, ShoppingCart, FileText } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import NotAllowedPage from '../_components/errorPages/NotAllowedPage';
import { useCurrentUser } from '@/src/hooks/use-current-user';

const getCurrTime = () => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}


function SellPage() {
    const [code, setCode] = useState("");
    const [kurti, setKurti] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selling, setSelling] = useState(false);
    const [sizes, setSellSize] = useState(0);
    const [showSellForm, setShowSellForm] = useState(false);
    
    // Sale details
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [selledPrice, setSelledPrice] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    
    const currentUser = useCurrentUser();

    const handleFind = async () => {
        try {
            setLoading(true);
            if (code.length < 6) {
                toast.error('Please enter correct code!!!');
                return;
            }

            const res = await axios.post(`/api/kurti/find-kurti`, { code });
            const data = res.data.data;
            
            if (data.error) {
                toast.error(data.error);
                setKurti(null);
                setShowSellForm(false);
            } else {
                setKurti(data.kurti);
                setSellSize(data.kurti.sizes.length);
                setSelledPrice(data.kurti.sellingPrice);
                setShowSellForm(true);
                toast.success('Product found!');
            }
        } catch (error) {
            console.error('Error finding product:', error);
            toast.error('Error finding product');
        } finally {
            setLoading(false);
        }
    }

    const handleSell = async () => {
        try {
            setSelling(true);
            
            if (!customerName.trim()) {
                toast.error('Please enter customer name');
                return;
            }
            
            if (!selectedSize) {
                toast.error('Please select size');
                return;
            }
            
            if (!selledPrice || parseInt(selledPrice) <= 0) {
                toast.error('Please enter valid selling price');
                return;
            }

            const currentTime = getCurrTime();
            const fullCode = code.toUpperCase() + selectedSize.toUpperCase();
            
            const res = await axios.post(`/api/sell`, {
                code: fullCode,
                currentUser,
                currentTime: currentTime,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim(),
                selledPrice: parseInt(selledPrice),
                selectedSize: selectedSize
            });

            const data = res.data.data;
            
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success('Sold Successfully!');
                // Generate invoice
                generateInvoice(data);
                resetForm();
            }
        } catch (error) {
            console.error('Error selling product:', error);
            toast.error('Error processing sale');
        } finally {
            setSelling(false);
        }
    }

    const generateInvoice = (saleData: any) => {
        const invoiceWindow = window.open('', '_blank');
        if (!invoiceWindow) return;

        const invoiceHTML = generateInvoiceHTML(saleData);
        invoiceWindow.document.write(invoiceHTML);
        invoiceWindow.document.close();
        
        // Auto print
        setTimeout(() => {
            invoiceWindow.print();
        }, 500);
    }

    const generateInvoiceHTML = (saleData: any) => {
        const currentDate = new Date().toLocaleDateString('en-IN');
        const currentTime = new Date().toLocaleTimeString('en-IN');
        const invoiceNumber = `INV-${Date.now()}`;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice - ${invoiceNumber}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f5f5f5;
                }
                .invoice-container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 30px; 
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .header { 
                    text-align: center; 
                    border-bottom: 3px solid #e74c3c; 
                    padding-bottom: 20px; 
                    margin-bottom: 30px;
                }
                .shop-name { 
                    font-size: 32px; 
                    font-weight: bold; 
                    color: #e74c3c; 
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                .shop-tagline { 
                    font-size: 16px; 
                    color: #666; 
                    margin: 5px 0 0 0;
                    font-style: italic;
                }
                .invoice-details { 
                    display: flex; 
                    justify-content: space-between; 
                    margin-bottom: 30px;
                    flex-wrap: wrap;
                }
                .invoice-info, .customer-info { 
                    flex: 1; 
                    min-width: 250px;
                    margin: 10px;
                }
                .invoice-info h3, .customer-info h3 { 
                    color: #2c3e50; 
                    border-bottom: 2px solid #ecf0f1; 
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }
                .info-row { 
                    margin-bottom: 8px; 
                    display: flex;
                }
                .info-label { 
                    font-weight: bold; 
                    min-width: 100px;
                    color: #555;
                }
                .product-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 30px 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .product-table th { 
                    background: #34495e; 
                    color: white; 
                    padding: 15px; 
                    text-align: left;
                    font-weight: bold;
                }
                .product-table td { 
                    padding: 15px; 
                    border-bottom: 1px solid #ecf0f1;
                }
                .product-table tr:nth-child(even) { 
                    background-color: #f8f9fa;
                }
                .total-section { 
                    text-align: right; 
                    margin-top: 30px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                .total-amount { 
                    font-size: 24px; 
                    font-weight: bold; 
                    color: #e74c3c;
                    margin-top: 10px;
                }
                .footer { 
                    text-align: center; 
                    margin-top: 40px; 
                    padding-top: 20px; 
                    border-top: 2px solid #ecf0f1;
                    color: #666;
                }
                .thank-you { 
                    font-size: 18px; 
                    color: #27ae60; 
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                @media print {
                    body { background: white; }
                    .invoice-container { box-shadow: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <h1 class="shop-name">Radhe Beautic</h1>
                    <p class="shop-tagline">Premium Fashion Collection</p>
                </div>
                
                <div class="invoice-details">
                    <div class="invoice-info">
                        <h3>Invoice Details</h3>
                        <div class="info-row">
                            <span class="info-label">Invoice #:</span>
                            <span>${invoiceNumber}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Date:</span>
                            <span>${currentDate}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Time:</span>
                            <span>${currentTime}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Seller:</span>
                            <span>${currentUser?.name || 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="customer-info">
                        <h3>Customer Details</h3>
                        <div class="info-row">
                            <span class="info-label">Name:</span>
                            <span>${customerName}</span>
                        </div>
                        ${customerPhone ? `
                        <div class="info-row">
                            <span class="info-label">Phone:</span>
                            <span>${customerPhone}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <table class="product-table">
                    <thead>
                        <tr>
                            <th>Product Code</th>
                            <th>Category</th>
                            <th>Size</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${kurti.code.toUpperCase()}</td>
                            <td>${kurti.category}</td>
                            <td>${selectedSize.toUpperCase()}</td>
                            <td>1</td>
                            <td>₹${selledPrice}</td>
                            <td>₹${selledPrice}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div style="font-size: 16px; margin-bottom: 5px;">
                        <strong>Subtotal: ₹${selledPrice}</strong>
                    </div>
                    <div style="font-size: 16px; margin-bottom: 10px;">
                        <strong>Tax: ₹0</strong>
                    </div>
                    <div class="total-amount">
                        Total Amount: ₹${selledPrice}
                    </div>
                </div>
                
                <div class="footer">
                    <div class="thank-you">Thank you for your purchase!</div>
                    <p>Visit us again for more amazing collections</p>
                    <p style="font-size: 12px; color: #999;">
                        This is a computer generated invoice. For any queries, please contact us.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    const resetForm = () => {
        setCode("");
        setKurti(null);
        setShowSellForm(false);
        setCustomerName("");
        setCustomerPhone("");
        setSelledPrice("");
        setSelectedSize("");
    }

    const getAvailableSizes = () => {
        if (!kurti?.sizes) return [];
        return kurti.sizes.filter((sz: any) => sz.quantity > 0);
    }

    return (
        <Card className="w-[95%] max-w-4xl">
            <CardHeader>
                <p className="text-2xl font-semibold text-center">
                    🛒 Product Sale System
                </p>
            </CardHeader>
            <CardContent className='w-full flex flex-col space-evenly justify-center flex-wrap gap-4'>
                {/* Search Section */}
                <div className='bg-slate-50 p-4 rounded-lg'>
                    <h3 className="text-lg font-semibold mb-3">Find Product</h3>
                    <div className='flex flex-row flex-wrap gap-2 items-end'>
                        <div className='flex flex-col flex-wrap'>
                            <Label htmlFor="product-code">Product Code</Label>
                            <Input
                                id="product-code"
                                className='w-[250px]'
                                placeholder='Enter product code (without size)'
                                value={code}
                                onKeyUp={(e) => {
                                    if (e.key === 'Enter') {
                                        handleFind();
                                    }
                                }}
                                onChange={(e) => { setCode(e.target.value); }}
                            />
                        </div>
                        <Button 
                            type='button' 
                            onClick={handleFind} 
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Find Product
                        </Button>
                    </div>
                </div>

                {/* Product Details */}
                {kurti && (
                    <div className='bg-white border rounded-lg p-4'>
                        <h3 className="text-lg font-semibold mb-3">Product Details</h3>
                        <div className='flex flex-col lg:flex-row gap-4'>
                            <div className='flex-shrink-0'>
                                <img 
                                    src={kurti.images[0]?.url} 
                                    alt={kurti.code}
                                    className="w-64 h-64 object-cover rounded-lg border"
                                />
                            </div>
                            <div className='flex-1 space-y-2'>
                                <p className='text-xl font-bold'>Code: {kurti.code.toUpperCase()}</p>
                                <p className='text-lg'>Category: {kurti.category}</p>
                                <p className='text-lg'>Party: {kurti.party}</p>
                                <p className='text-xl font-semibold text-green-600'>
                                    MRP: ₹{kurti.sellingPrice}
                                </p>
                                
                                {/* Size Table */}
                                <div className='mt-4'>
                                    <h4 className='font-semibold mb-2'>Available Sizes:</h4>
                                    <div className='flex flex-wrap gap-4'>
                                        <Table className='border border-collapse max-w-md'>
                                            <TableHeader>
                                                <TableRow className='bg-slate-800'>
                                                    <TableHead className='font-bold border text-white'>SIZE</TableHead>
                                                    <TableHead className='font-bold border text-white'>STOCK</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {kurti.sizes.map((sz: any, i: number) => (
                                                    <TableRow key={i} className={sz.quantity === 0 ? 'opacity-50' : ''}>
                                                        <TableCell className='border'>{sz.size.toUpperCase()}</TableCell>
                                                        <TableCell className={`border ${sz.quantity === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                            {sz.quantity}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sale Form */}
                {showSellForm && (
                    <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
                        <h3 className="text-lg font-semibold mb-4 text-green-800">Sale Details</h3>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor="customer-name">Customer Name *</Label>
                                <Input
                                    id="customer-name"
                                    placeholder='Enter customer name'
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="customer-phone">Customer Phone (Optional)</Label>
                                <Input
                                    id="customer-phone"
                                    placeholder='Enter customer phone'
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="size-select">Select Size *</Label>
                                <select
                                    id="size-select"
                                    className="w-full p-2 border rounded-md"
                                    value={selectedSize}
                                    onChange={(e) => setSelectedSize(e.target.value)}
                                >
                                    <option value="">Select Size</option>
                                    {getAvailableSizes().map((sz: any, i: number) => (
                                        <option key={i} value={sz.size}>
                                            {sz.size.toUpperCase()} (Stock: {sz.quantity})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label htmlFor="selling-price">Selling Price *</Label>
                                <Input
                                    id="selling-price"
                                    type="number"
                                    placeholder='Enter selling price'
                                    value={selledPrice}
                                    onChange={(e) => setSelledPrice(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className='flex gap-3 mt-6'>
                            <Button 
                                type='button' 
                                onClick={handleSell} 
                                disabled={selling}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {selling ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                )}
                                Complete Sale & Generate Invoice
                            </Button>
                            <Button 
                                type='button' 
                                variant="outline"
                                onClick={resetForm}
                                disabled={selling}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const SellerHelp = () => {
    return (
        <>
            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.SELLER]}>
                <SellPage />
            </RoleGateForComponent>
            <RoleGateForComponent allowedRole={[UserRole.UPLOADER]}>
                <NotAllowedPage />
            </RoleGateForComponent>
        </>
    )
}

export default SellerHelp