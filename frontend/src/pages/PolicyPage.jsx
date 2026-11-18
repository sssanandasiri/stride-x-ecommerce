import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { shop } from "../config/shop";
import { policyDocs, policyNav } from "../data/policies";

/*
  One component renders all five text pages (Delivery, Returns, FAQs, Privacy,
  Terms). The route says WHICH one via the `doc` prop, and the words live in
  data/policies.js. Adding another page = add data + one <Route>.
*/
export default function PolicyPage({ doc }) {
  const page = policyDocs[doc];

  // React Router doesn't scroll to the top on navigation, so do it ourselves.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${page.title} | ${shop.name}`;
  }, [doc, page.title]);

  return (
    <section className="section-p1">
      <div className="policy-layout">
        <nav className="policy-nav" aria-label="Help and policies">
          {policyNav.map((item) => (
            <NavLink key={item.doc} to={item.path} className={({ isActive }) => (isActive ? "active" : undefined)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <article className="policy-body">
          {shop.showDraftNotice && (
            <p className="policy-draft" role="note">
              Draft template text. Have it reviewed by a lawyer and check it matches how you really operate,
              then set <code>showDraftNotice</code> to <code>false</code> in <code>src/config/shop.js</code>.
            </p>
          )}

          <h1 className="display">{page.title}</h1>
          <p className="policy-updated">Last updated {shop.policiesUpdated}</p>
          <p className="policy-intro">{page.intro}</p>

          {page.sections.map((section) => (
            <div key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((text) => <p key={text}>{text}</p>)}
              {section.bullets && (
                <ul>
                  {section.bullets.map((text) => <li key={text}>{text}</li>)}
                </ul>
              )}
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
