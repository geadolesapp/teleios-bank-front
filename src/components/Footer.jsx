import "../App.css";
import logoGe from "../assets/LogoGE.png";

function Footer() {
  const ano = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-brand">
        <img src={logoGe} alt="GE adoles" className="footer-logo" />
      </div>

      <div className="footer-texts">
        <span>© {ano} GE adoles. Todos os direitos reservados.</span>
        <span className="footer-separator">|</span>
        <a
          href="https://www.linkedin.com/in/joaoeduardolima/"
          target="_blank"
          rel="noreferrer"
          className="footer-link"
        >
          Desenvolvido por João Eduardo Lima
        </a>
      </div>
    </footer>
  );
}

export default Footer;
