import { useStore } from '../context/StoreContext'
import { ReturnIcon, ShieldIcon, TruckIcon } from './Icons'

export function Footer() {
  const { info } = useStore()
  const d = info?.deployment
  return (
    <footer className="site-footer">
      <div className="footer-perks">
        <div>
          <TruckIcon />
          <div>
            <strong>Envío a todo el país</strong>
            <span>Costo calculado al finalizar tu compra</span>
          </div>
        </div>
        <div>
          <ReturnIcon />
          <div>
            <strong>Devoluciones fáciles</strong>
            <span>Tienes 30 días para cambiar de opinión</span>
          </div>
        </div>
        <div>
          <ShieldIcon />
          <div>
            <strong>Pago seguro</strong>
            <span>Tus datos viajan cifrados</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Online Boutique</span>
        <span>Proyecto de demostración DevOps · Microservicios en Kubernetes</span>
        {d && (d.clustername || d.zone || d.hostname) && (
          <span className="deployment-details">
            {d.clustername && (
              <>
                <b>Cluster:</b> {d.clustername}{' '}
              </>
            )}
            {d.zone && (
              <>
                <b>Zona:</b> {d.zone}{' '}
              </>
            )}
            {d.hostname && (
              <>
                <b>Pod:</b> {d.hostname}
              </>
            )}
          </span>
        )}
      </div>
    </footer>
  )
}
