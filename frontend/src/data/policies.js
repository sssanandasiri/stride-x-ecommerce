import { shop } from "../config/shop";

/*
  The text of the legal and help pages. Each page is plain data:
    { title, intro, sections: [{ heading, paragraphs?: [...], bullets?: [...] }] }
  PolicyPage.jsx turns this into HTML. To change wording, edit it here.
  Anything that depends on your business comes from config/shop.js.

  IMPORTANT: this is a sensible STARTING TEMPLATE, not legal advice.
  Have a lawyer review it before you take real orders.
*/

export const policyNav = [
  { doc: "delivery", path: "/delivery", label: "Delivery" },
  { doc: "returns", path: "/returns", label: "Returns & refunds" },
  { doc: "faq", path: "/faq", label: "FAQs" },
  { doc: "privacy", path: "/privacy", label: "Privacy policy" },
  { doc: "terms", path: "/terms", label: "Terms & conditions" },
];

export const policyDocs = {
  delivery: {
    title: "Delivery",
    intro: `We deliver ${shop.deliveryArea}. Here's how long it takes and what to expect.`,
    sections: [
      {
        heading: "How long it takes",
        bullets: [
          `Colombo and nearby areas: ${shop.deliveryTimeColombo}.`,
          `Everywhere else: ${shop.deliveryTimeElsewhere}.`,
        ],
        paragraphs: [
          "Delivery times are estimates, not guarantees. The clock starts once your order is confirmed, which for online payments means after your payment goes through.",
        ],
      },
      {
        heading: "What it costs",
        paragraphs: [shop.deliveryFeeText],
      },
      {
        heading: "What happens after you order",
        bullets: [
          "You get a confirmation email if you gave us your email address.",
          "When your parcel is handed to the courier, we email you again.",
          "The courier calls the phone number on your order, so please double-check it.",
        ],
      },
      {
        heading: "Paying cash on delivery",
        paragraphs: [
          "Pay the courier in cash when your order arrives. Please have the exact amount ready if you can.",
        ],
      },
      {
        heading: "Online payments that aren't completed",
        paragraphs: [
          `If you choose an online payment method and don't finish paying within ${shop.unpaidOrderMinutes} minutes, we cancel the order and release the items so other customers can buy them. You haven't been charged. Just place the order again.`,
        ],
      },
      {
        heading: "If we can't reach you, or the parcel is damaged",
        paragraphs: [
          `If the courier can't reach you, the parcel may be sent back to us. Contact us at ${shop.email} and we'll arrange a new delivery.`,
          "If your parcel arrives damaged, contact us as soon as you can and send photos of the parcel and the item.",
        ],
      },
    ],
  },

  returns: {
    title: "Returns & refunds",
    intro: `Not right? You can return most items within ${shop.returnWindowDays} days of delivery.`,
    sections: [
      {
        heading: "What can be returned",
        bullets: [
          "Shoes, belts and wallets that are unworn and unused, in their original box or packaging.",
          "Socks and shoe-care products only if they're unopened, or faulty. This is for hygiene reasons.",
        ],
      },
      {
        heading: "Faulty or wrong item",
        paragraphs: [
          "If something arrives faulty, damaged, or isn't what you ordered, tell us as soon as you notice. We'll replace it or refund you.",
          shop.returnShippingText,
        ],
      },
      {
        heading: "How to return something",
        bullets: [
          `Email ${shop.email} with your order number (it starts with SX-) and what you'd like to return.`,
          "We'll reply with the return address and instructions. Please don't send anything before you hear from us.",
          "Pack the item securely in its original box.",
        ],
      },
      {
        heading: "Refunds",
        bullets: [
          `Once we receive and check your return, we refund you within ${shop.refundTime}.`,
          "Online payments are refunded to the method you paid with.",
          "Cash-on-delivery orders are refunded by bank transfer. We'll ask you for your bank details by email.",
          "If we cancel your order before it ships, you get a full refund of anything you paid.",
        ],
      },
      {
        heading: "Exchanges",
        paragraphs: [
          "Need a different size? Contact us. We'll swap it if the size is in stock. If it isn't, we'll refund you.",
        ],
      },
    ],
  },

  faq: {
    title: "FAQs",
    intro: "Quick answers to the things people ask most.",
    sections: [
      {
        heading: "How do I pay?",
        paragraphs: [
          "You'll see the payment options available at checkout. Cash on delivery is always offered. Card and instalment options (Koko, Mintpay, PayZ) appear when they're available.",
        ],
      },
      {
        heading: "How do I know when my order ships?",
        paragraphs: [
          "If you entered your email at checkout, we email you when your order is confirmed and again when it ships.",
        ],
      },
      {
        heading: "Can I change or cancel my order?",
        paragraphs: [
          `Contact us at ${shop.email} or ${shop.phone} as soon as possible. We can cancel an order that hasn't shipped yet.`,
        ],
      },
      {
        heading: "My payment failed. What now?",
        paragraphs: [
          "The order is cancelled and nothing is charged. Your cart is still saved, so you can try again from the checkout page.",
        ],
      },
      {
        heading: "Is the shopping assistant a real person?",
        paragraphs: [
          "No, it's an AI assistant. It checks our live catalog, but it can make mistakes, so always confirm the price and size on the product page. For anything about an order, contact us directly.",
        ],
      },
      {
        heading: "How do I stop newsletter emails?",
        paragraphs: ["Use the unsubscribe link at the bottom of any newsletter email."],
      },
      {
        heading: "How do I contact you?",
        paragraphs: [`Email ${shop.email}, call ${shop.phone} (${shop.hours}), or use the contact page.`],
      },
    ],
  },

  privacy: {
    title: "Privacy policy",
    intro: `${shop.legalName} runs this online shop. This page explains what personal information we collect, why, and what you can do about it.`,
    sections: [
      {
        heading: "What we collect",
        bullets: [
          "Order details: your name, phone number, delivery address, email (if you give one), and what you ordered.",
          "Messages you send us through the contact form or by email.",
          "Your email address, if you subscribe to our newsletter.",
          "What you type into the shopping assistant chat.",
          "Standard server logs, such as your IP address and the pages requested, which help us keep the site secure and working.",
        ],
      },
      {
        heading: "How we use it",
        bullets: [
          "To process, deliver and support your orders.",
          "To send order receipts and updates.",
          "To reply to your messages.",
          "To send our newsletter, only if you subscribed. You can unsubscribe at any time.",
          "To detect fraud and abuse and to keep the site secure.",
        ],
      },
      {
        heading: "Payments",
        paragraphs: [
          "When you pay online, the payment is handled by the payment provider (for example a card gateway, Koko, Mintpay or PayZ). We don't see or store your full card number. For cash on delivery, no payment details are collected.",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: ["Only the people we need to run the shop:"],
        bullets: [
          "Couriers, who get your name, phone number and address to deliver your order.",
          "Payment providers, to take and confirm payments.",
          "Our email and hosting providers, who handle data on our behalf.",
          "The AI provider behind the shopping assistant (Anthropic). Messages you type in the chat are sent to it to produce replies, so please don't type sensitive personal information into the chat.",
        ],
      },
      {
        heading: "Your browser's storage",
        paragraphs: [
          "Your cart, wishlist and recently viewed items are kept in your own browser so they're still there when you come back. We don't currently use advertising or tracking cookies.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "We keep order records for as long as we need them for accounting, tax and legal reasons. Newsletter emails are kept until you unsubscribe. Contact messages are kept only as long as needed to deal with your enquiry.",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          `You can ask us to show you the personal information we hold about you, correct it, or delete it. Email ${shop.email}. We may need to keep some order information for legal reasons.`,
          "If you're under 18, please ask a parent or guardian to place orders for you.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [`We'll update this page if our practices change. Last updated: ${shop.policiesUpdated}.`],
      },
    ],
  },

  terms: {
    title: "Terms & conditions",
    intro: `These terms apply when you use this website or place an order with ${shop.legalName}.`,
    sections: [
      {
        heading: "Using the site",
        paragraphs: [
          "By using this site or placing an order you agree to these terms. Please don't misuse the site, for example by scraping it automatically, trying to break into it, or placing orders you don't intend to pay for.",
        ],
      },
      {
        heading: "Orders",
        paragraphs: [
          "When you place an order you're making an offer to buy. We accept it when we confirm your order. We may decline or cancel an order, for example if an item is out of stock, a price was shown wrongly, or we suspect fraud. If that happens, we refund anything you've paid.",
        ],
      },
      {
        heading: "Prices and payment",
        paragraphs: [
          "Prices are in Sri Lankan rupees (LKR). The price at checkout is the price you pay.",
          `Online payments must be completed within ${shop.unpaidOrderMinutes} minutes of placing the order, otherwise the order is cancelled automatically.`,
        ],
      },
      {
        heading: "Products and stock",
        paragraphs: [
          "We try to describe and photograph products accurately, but colours can look slightly different on your screen. Stock changes quickly, so we check availability when you place your order.",
        ],
      },
      {
        heading: "Delivery and returns",
        paragraphs: [
          "Delivery is covered on our Delivery page and returns and refunds on our Returns page. Both are part of these terms.",
        ],
      },
      {
        heading: "Our responsibility",
        paragraphs: [
          "We don't exclude any responsibility that the law doesn't allow us to exclude. Beyond that, and as far as the law allows, our responsibility for any order is limited to the price you paid for it.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: ["These terms are governed by the laws of Sri Lanka."],
      },
      {
        heading: "Contact us",
        paragraphs: [`Questions about these terms? Email ${shop.email}. Last updated: ${shop.policiesUpdated}.`],
      },
    ],
  },
};
