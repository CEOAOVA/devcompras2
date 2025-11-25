import pandas as pd
from . import get_sucursal as gs
import os

def excel_dataframization_stock(path : str):

    # Read
    header_row = None
    raw_df = pd.read_excel(path)
    
    # Find the header row    
    for i, row in raw_df.iterrows():
        if "Artículo" in row.values:
            header_row = i
            break
    
    
    if header_row is None:
        raise ValueError(f"No header found in {path}")
    
    # Starting header of the table
    df = pd.read_excel(path, header=(header_row+1))

    # Print df creado
    print("Primer corte: ", df.head())

    #Dropping last non table row from Excel
    df = df.iloc[:-2]

    # Get Number of Sucursal
    sucursal = gs.get_sucursal(path)

    df.columns = ["Código", "Artículo", "Unidades"]


    print("Finalis: ", df.head())

    print("Columne: ", df.columns)
    print("Código: ", df.loc[0, "Código"])
    print("CArtículo: ", df.loc[0, "Artículo"])
    print("Unidades: ", df.loc[0, "Unidades"])
    

    return df, sucursal
