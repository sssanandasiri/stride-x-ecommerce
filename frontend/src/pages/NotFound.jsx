import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="wrap empty-state">
      <i className="fas fa-compass"></i>
      <h1 className="display">Page not found</h1>
      <p>That page doesn't exist — maybe it moved, or the link's outdated.</p>
      <Link to="/"><button className="btn-primary">Back to home</button></Link>
    </div>
  );
}
