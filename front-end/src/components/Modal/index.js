import './index.scss';

var text;
const Modal = ({ data }) => {
    return (
        <div className={ 'modal-bg' }>
            <div className={ 'modal' }>
                <p> { data } </p>
                <span>
                    <a onClick={ () => {
                        return true;
                    } }>Okay</a>
                    <a onClick={ () => {
                        return false;
                    } }>Cancel</a>
                </span>
            </div>
        </div>
    );
}

export default Modal;