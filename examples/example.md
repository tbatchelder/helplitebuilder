// Lines starting with // at column ZERO are builder comments.
// They never appear in any generated output.
//
// This file is both the example and the torture test: every construct in it
// is one that a naive line-by-line parser gets wrong. If the builder handles
// this file, it handles a real help file.

// Which layout to generate. Only 'standard' exists today.
@build(standard)

// The stylesheet baked into the <head> of the generated global help page.
// Required, and must end in .css.
@link(/styles/help.css)

// ---------------------------------------------------------------------------
// TOOLTIPS -- the "?" help. One line each: name | text
// Names must be unique across the WHOLE site, since HelpLite looks them up
// by name alone. Allowed characters: letters, numbers, underscore, hyphen.
// Everything after the first pipe is the text, so pipes inside the text
// itself are fine.
// ---------------------------------------------------------------------------
@tt
businessName | Legal name of the business.
ein | Federal Employer Identification Number.
receiptAmount | Total purchase amount shown on the receipt.
receiptVendor | Business where the purchase was made.
entityType | Sole proprietor | LLC | S-Corp | C-Corp.
@ett

// ---------------------------------------------------------------------------
// PAGE CONTEXT -- the in-page help panel, one file per page.
// A new context starts with 'name | text' at COLUMN ZERO. Every line after it,
// until the next name line or @epc, belongs to that context and is rendered
// as markdown -- headings, lists, bold, code, all of it.
// ---------------------------------------------------------------------------
@pc
newbusiness | ## Creating a Business

Create your business before adding any records.

- Add contacts
  - A primary contact is required
    - Phone | work or mobile
- Add documents

```js
// Indented and fenced content is passed through untouched.
const label = firstName | lastName;
```

receipts | Store receipts for bookkeeping, tax prep and audit support.

Use clear photographs whenever possible.

contacts | Store your professional contacts.
@epc

// ---------------------------------------------------------------------------
// Everything from here down is plain markdown and becomes the global help
// page. Headings get id attributes automatically, so they can be linked to.
// The first level-1 heading becomes the page <title>.
// ---------------------------------------------------------------------------

# Help

Welcome to the application help.

## New Business

Use this page to create and manage your business profile.

### Next Steps

After creating a business profile you should:

- Add professional contacts
  - Accountant
  - Attorney
- Upload important documents
- Configure notifications

## Receipts

Take a clear photo of the receipt and verify the important details are
visible, then assign a category so reports stay accurate.

### Configuration Example

A fenced code block. The builder does not interpret anything inside one --
the comment, the directive and the pipe below all survive:

```js
// This comment is code, not a builder comment.
const config = {
  helpDir: 'public/help'
};

// @tt is not a directive in here.
const mask = FLAG_A | FLAG_B;
```

A tilde fence, so a backtick fence can be shown inside it:

````text
```js
const x = 1;
```
````

An indented code block, which has no fence to mark it:

    // Four spaces of indent. Still code.
    const y = 2;

### Reference Table

| Field         | Required | Notes                  |
| ------------- | -------- | ---------------------- |
| Business name | Yes      | Legal name, not DBA    |
| EIN           | No       | Required before filing |

## Overview

Duplicate headings are fine. This one and the next both slugify to
`overview`, so the builder numbers them to keep the ids unique.

## Overview

The second one becomes `overview-1`.
