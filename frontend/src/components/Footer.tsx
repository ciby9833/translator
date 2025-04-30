import { useTranslation } from 'react-i18next';
import LanguageSwitch from './LanguageSwitch';
import './Footer.css';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="copyright">
          © {currentYear} JT Cargo. {t('footer.allRightsReserved')}
        </div>
        <LanguageSwitch />
      </div>
    </footer>
  );
};

export default Footer;
