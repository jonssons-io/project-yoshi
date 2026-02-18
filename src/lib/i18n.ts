import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import sv from '../locales/sv.json'

i18n.use(initReactI18next).init({
	resources: {
		sv: {
			translation: sv
		}
	},
	lng: 'sv', // Hardcoded default locale
	fallbackLng: 'sv',
	interpolation: {
		escapeValue: false // react already safes from xss
	}
})

export default i18n
