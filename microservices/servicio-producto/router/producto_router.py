from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import obtener_db
from schemas.producto import ProductoCreate, ProductoResponse
from controllers import producto_controller

router = APIRouter(
    prefix = "/api",
    tags=["productos"]
)

@router.get("/", response_model= list[ProductoResponse])
def listar_productos(db:Session = Depends(obtener_db)):
    return producto_controller.obtener_productos(db)

@router.get("/{codigo}", response_model=ProductoResponse)
def obtener_producto_por_id(codigo: int, db: Session = Depends(obtener_db)):
    producto = producto_controller.obtener_productos_id(db, codigo)
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@router.post("/", response_model=ProductoResponse)
def registrar_producto(datos: ProductoCreate, db: Session = Depends(obtener_db)):
    return producto_controller.crear_producto(db, datos)

@router.put("/{codigo}", response_model=ProductoResponse)
def modificar_producto(codigo:int, datos:ProductoCreate, db: Session = Depends(obtener_db)):
    producto = producto_controller.actualizar_producto(db, codigo, datos)
    if producto is None:
        raise HTTPException(404, "Producto no encontrado")
    return producto

@router.delete("/{codigo}")
def borrar_producto(codigo: int, db: Session = Depends(obtener_db)):
    producto_eliminado = producto_controller.eliminar_producto(db, codigo)
    if producto_eliminado is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"mensaje": "Producto Eliminado correctamente"}