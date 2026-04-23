 
'use client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { Upload } from 'lucide-react';

import { useCreateOrder }    from './_components/useCreateOrder';
import { MerchantPicker }    from './_components/MerchantPicker';
import { CustomerPicker }    from './_components/CustomerPicker';
import { AddressPicker }     from './_components/AddressPicker';
import { MenuCatalog }       from './_components/MenuCatalog';
import { CustomOrderPanel }  from './_components/CustomOrderPanel';
import { CartPanel }         from './_components/CartPanel';
import { ChargesPanel }      from './_components/ChargesPanel';
import { BulkUploadModal }   from './_components/BulkUploadModal';
import { OrderSummaryBar }   from './_components/OrderSummaryBar';
import type { OrderType }    from './_components/types';

export default function AdminCreateOrderPage() {
  const o = useCreateOrder();

  if (o.authLoading || o.bootLoading) return <PageLoadingSpinner />;

  return (
    <>
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-6 pb-28 space-y-5">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <span className="text-4xl">📝</span> Create Order
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">
                Manual order · walk-in · custom order · bulk upload
              </p>
            </div>
            <button
              type="button"
              onClick={() => o.setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary
                         text-primary font-bold text-sm hover:bg-orange-50
                         transition-all hover:scale-105 active:scale-95 w-fit"
            >
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
          </div>

          {/* ── Order type toggle ── */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
            {([
              { id: 'restaurant', label: '🍽️ Restaurant Order' },
              { id: 'custom',     label: '📦 Custom Order'     },
            ] as { id: OrderType; label: string }[]).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => o.setOrderType(t.id)}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                  o.orderType === t.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">

            {/* LEFT column */}
            <div className="space-y-5">

              <MerchantPicker
                merchants={o.merchants}
                merchantId={o.merchantId}
                setMerchantId={o.setMerchantId}
                merchant={o.merchant}
              />

              <CustomerPicker
                customerMode={o.customerMode}
                setCustomerMode={o.setCustomerMode}
                customerQuery={o.customerQuery}
                setCustomerQuery={o.setCustomerQuery}
                customerSearching={o.customerSearching}
                customerResults={o.customerResults}
                customerId={o.customerId}
                setCustomerId={o.setCustomerId}
                walkinName={o.walkinName}
                setWalkinName={o.setWalkinName}
                walkinPhone={o.walkinPhone}
                setWalkinPhone={o.setWalkinPhone}
                phoneMatchResult={o.phoneMatchResult}
                phoneMatchLoading={o.phoneMatchLoading}
                linkedCustomerId={o.linkedCustomerId}
                setLinkedCustomerId={o.setLinkedCustomerId}
              />

              <AddressPicker
                addressQuery={o.addressQuery}
                setAddressQuery={o.setAddressQuery}
                addressSearching={o.addressSearching}
                addressOptions={o.addressOptions}
                showAddressDropdown={o.showAddressDropdown}
                setShowAddressDropdown={o.setShowAddressDropdown}
                deliveryAddress={o.deliveryAddress}
                setDeliveryAddress={o.setDeliveryAddress}
                deliveryLat={o.deliveryLat}
                deliveryDistanceKm={o.deliveryDistanceKm}
                deliveryFee={o.deliveryFee}
                setDeliveryFee={o.setDeliveryFee}
                chooseAddress={o.chooseAddress}
                handleCurrentLocation={o.handleCurrentLocation}
                computeFeeFromDistance={o.computeFeeFromDistance}
                merchant={o.merchant}
              />

              {/* Custom order extra fields */}
              {o.orderType === 'custom' && (
                <CustomOrderPanel
                  customCategory={o.customCategory}
                  setCustomCategory={o.setCustomCategory}
                  customDescription={o.customDescription}
                  setCustomDescription={o.setCustomDescription}
                  customImageUrl={o.customImageUrl}
                  setCustomImageUrl={o.setCustomImageUrl}
                />
              )}

              <MenuCatalog
                merchantId={o.merchantId}
                menuLoading={o.menuLoading}
                menuSearch={o.menuSearch}
                setMenuSearch={o.setMenuSearch}
                vegOnly={o.vegOnly}
                setVegOnly={o.setVegOnly}
                menuByCategory={o.menuByCategory}
                customProductsByCategory={o.customProductsByCategory}
                expandedCategories={o.expandedCategories}
                toggleCategory={o.toggleCategory}
                items={o.items}
                addItem={o.addItem}
                addCustomProduct={o.addCustomProduct}
              />
            </div>

            {/* RIGHT column — cart + charges */}
            <div className="space-y-5 lg:sticky lg:top-6">
              <CartPanel
                items={o.items}
                changeQty={o.changeQty}
                removeItem={o.removeItem}
                updateItemNote={o.updateItemNote}
              />

              <ChargesPanel
                subtotal={o.subtotal}
                itemDiscountTotal={o.itemDiscountTotal}
                promoDiscount={o.promoDiscount}
                discount={o.discount}
                setDiscount={o.setDiscount}
                tax={o.tax}
                setTax={o.setTax}
                extraCharges={o.extraCharges}
                setExtraCharges={o.setExtraCharges}
                autoGst={o.autoGst}
                setAutoGst={o.setAutoGst}
                totalAmount={o.totalAmount}
                promoCodes={o.promoCodes}
                selectedPromoCode={o.selectedPromoCode}
                setSelectedPromoCode={o.setSelectedPromoCode}
                promoApplied={o.promoApplied}
                applyPromo={o.applyPromo}
                status={o.status}
                setStatus={o.setStatus}
                paymentMethod={o.paymentMethod}
                setPaymentMethod={o.setPaymentMethod}
                paymentStatus={o.paymentStatus}
                setPaymentStatus={o.setPaymentStatus}
                customerNotes={o.customerNotes}
                setCustomerNotes={o.setCustomerNotes}
                specialInstructions={o.specialInstructions}
                setSpecialInstructions={o.setSpecialInstructions}
                recipientName={o.recipientName}
                setRecipientName={o.setRecipientName}
                deliveryInstructions={o.deliveryInstructions}
                setDeliveryInstructions={o.setDeliveryInstructions}
                merchantGst={!!o.merchant?.gst_enabled}
              />
            </div>
          </div>
        </div>
      </DashboardLayout>

      {/* ── Sticky bottom bar ── */}
      <OrderSummaryBar
        totalAmount={o.totalAmount}
        itemCount={o.items.length}
        submitting={o.submitting}
        onCreateAndOpen={() => o.createOrder({ openAfter: true })}
        onCreate={() => o.createOrder()}
      />

      {/* ── Bulk upload modal ── */}
      <BulkUploadModal
        open={o.showBulkModal}
        onClose={() => o.setShowBulkModal(false)}
        bulkText={o.bulkText}
        setBulkText={o.setBulkText}
        bulkBusy={o.bulkBusy}
        fileInputRef={o.fileInputRef}
        handleBulkFile={o.handleBulkFile}
        handlePasteFromClipboard={o.handlePasteFromClipboard}
        processBulkData={o.processBulkData}
        downloadTemplates={o.downloadTemplates}
      />
    </>
  );
}


