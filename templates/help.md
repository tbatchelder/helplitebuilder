// Build type for HelpLite. Only 'standard' exists today.
@build(standard)

// Stylesheet baked into the generated global help page. Required.
@link(/styles/help.css)

// Tooltip definitions -- one line each: name | text
@tt
businessName | Legal name of the business.
ein | Federal Employer Identification Number.
receiptAmount | Total purchase amount shown on the receipt.
@ett

// Page context help -- one panel per page: name | text, then any markdown
// until the next name line or @epc.
@pc
newbusiness | Create your business before adding documents, contacts, or receipts.

This information can be updated later.

receipts | Receipts are used for bookkeeping, tax preparation and audit support.

Use clear photographs whenever possible.
@epc

// Everything below is plain markdown and becomes the global help page.

# New Business

The New Business page is used to create and manage your business profile.

## Business Information

Enter the legal name of your business along with its entity type.

## Tax Information

Store your EIN and accounting preferences here.

## Next Steps

After creating a business profile you should:

- Add professional contacts
- Upload important documents
- Configure notifications

# Receipts

## Uploading Receipts

Take a clear photo of the receipt and verify the important details are
visible.

## Categorizing Receipts

Assign appropriate categories so reports remain accurate.

## Reporting

Categorized receipts will become available in financial reports and
exports.
