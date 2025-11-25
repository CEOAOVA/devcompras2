import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DemandPredictor:
    """
    Predictor de demanda para productos usando múltiples algoritmos de ML.
    Optimizado para refacciones con números de parte únicos.
    """
    
    def __init__(self):
        self.models = {
            'random_forest': RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            ),
            'gradient_boosting': GradientBoostingRegressor(
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42
            )
        }
        
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_importance = {}
        self.is_trained = False
        
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepara las características para el modelo.
        """
        logger.info("Preparando características para el modelo...")
        
        # Crear características temporales
        df['fecha'] = pd.to_datetime(df['fecha'])
        df['año'] = df['fecha'].dt.year
        df['mes'] = df['fecha'].dt.month
        df['dia_semana'] = df['fecha'].dt.dayofweek
        df['dia_mes'] = df['fecha'].dt.day
        df['trimestre'] = df['fecha'].dt.quarter
        
        # Características de lag (ventas pasadas)
        df_features = df.copy()
        for lag in [1, 7, 14, 30]:
            df_features[f'ventas_lag_{lag}'] = df_features.groupby('numero_parte')['cantidad_vendida'].shift(lag)
        
        # Media móvil
        for window in [7, 14, 30]:
            df_features[f'media_movil_{window}'] = (
                df_features.groupby('numero_parte')['cantidad_vendida']
                .rolling(window=window, min_periods=1)
                .mean()
            )
        
        # Tendencia
        df_features['tendencia'] = (
            df_features.groupby('numero_parte')['cantidad_vendida']
            .pct_change(periods=7)
            .fillna(0)
        )
        
        # Características de inventario
        if 'stock_actual' in df_features.columns:
            df_features['ratio_stock_ventas'] = df_features['stock_actual'] / (df_features['cantidad_vendida'] + 1)
            df_features['stock_bajo'] = (df_features['stock_actual'] < df_features['stock_minimo']).astype(int)
        
        # Codificar variables categóricas
        categorical_columns = ['numero_parte', 'categoria', 'almacen']
        for col in categorical_columns:
            if col in df_features.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    df_features[f'{col}_encoded'] = self.label_encoders[col].fit_transform(df_features[col].astype(str))
                else:
                    # Para nuevos datos, usar transform
                    try:
                        df_features[f'{col}_encoded'] = self.label_encoders[col].transform(df_features[col].astype(str))
                    except ValueError:
                        # Manejar valores no vistos durante el entrenamiento
                        df_features[f'{col}_encoded'] = 0
        
        # Rellenar valores faltantes
        df_features = df_features.fillna(0)
        
        return df_features
    
    def train(self, df: pd.DataFrame, target_column: str = 'cantidad_vendida') -> Dict:
        """
        Entrena los modelos de predicción.
        """
        logger.info("Iniciando entrenamiento del modelo...")
        
        # Preparar características
        df_features = self.prepare_features(df)
        
        # Seleccionar características para el modelo
        feature_columns = [
            'año', 'mes', 'dia_semana', 'dia_mes', 'trimestre',
            'ventas_lag_1', 'ventas_lag_7', 'ventas_lag_14', 'ventas_lag_30',
            'media_movil_7', 'media_movil_14', 'media_movil_30',
            'tendencia'
        ]
        
        # Agregar características codificadas
        encoded_columns = [col for col in df_features.columns if col.endswith('_encoded')]
        feature_columns.extend(encoded_columns)
        
        # Agregar características de inventario si están disponibles
        inventory_columns = ['ratio_stock_ventas', 'stock_bajo']
        for col in inventory_columns:
            if col in df_features.columns:
                feature_columns.append(col)
        
        # Filtrar columnas que existen
        feature_columns = [col for col in feature_columns if col in df_features.columns]
        
        X = df_features[feature_columns].copy()
        y = df_features[target_column].copy()
        
        # Remover filas con valores faltantes en el target
        mask = ~y.isna()
        X = X[mask]
        y = y[mask]
        
        logger.info(f"Usando {len(feature_columns)} características para entrenamiento")
        logger.info(f"Tamaño del dataset: {len(X)} registros")
        
        # Dividir datos
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=None
        )
        
        # Escalar características
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Entrenar modelos
        results = {}
        
        for name, model in self.models.items():
            logger.info(f"Entrenando modelo: {name}")
            
            # Entrenar
            model.fit(X_train_scaled, y_train)
            
            # Predicciones
            y_pred_train = model.predict(X_train_scaled)
            y_pred_test = model.predict(X_test_scaled)
            
            # Métricas
            train_mae = mean_absolute_error(y_train, y_pred_train)
            test_mae = mean_absolute_error(y_test, y_pred_test)
            train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
            test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
            train_r2 = r2_score(y_train, y_pred_train)
            test_r2 = r2_score(y_test, y_pred_test)
            
            # Validación cruzada
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='neg_mean_absolute_error')
            cv_mae = -cv_scores.mean()
            
            results[name] = {
                'train_mae': train_mae,
                'test_mae': test_mae,
                'train_rmse': train_rmse,
                'test_rmse': test_rmse,
                'train_r2': train_r2,
                'test_r2': test_r2,
                'cv_mae': cv_mae,
                'cv_std': cv_scores.std()
            }
            
            # Importancia de características (si está disponible)
            if hasattr(model, 'feature_importances_'):
                self.feature_importance[name] = dict(zip(feature_columns, model.feature_importances_))
            
            logger.info(f"{name} - Test MAE: {test_mae:.4f}, Test R²: {test_r2:.4f}")
        
        self.feature_columns = feature_columns
        self.is_trained = True
        
        logger.info("Entrenamiento completado")
        return results
    
    def predict(self, df: pd.DataFrame, model_name: str = 'random_forest', days_ahead: int = 30) -> pd.DataFrame:
        """
        Realiza predicciones de demanda.
        """
        if not self.is_trained:
            raise ValueError("El modelo debe ser entrenado antes de hacer predicciones")
        
        logger.info(f"Realizando predicciones con modelo: {model_name}")
        
        # Preparar características
        df_features = self.prepare_features(df)
        
        # Seleccionar características
        X = df_features[self.feature_columns].fillna(0)
        
        # Escalar
        X_scaled = self.scaler.transform(X)
        
        # Predicción
        model = self.models[model_name]
        predictions = model.predict(X_scaled)
        
        # Crear DataFrame de resultados
        results = df_features[['numero_parte', 'fecha']].copy()
        results['prediccion_demanda'] = np.maximum(0, predictions)  # No negativos
        results['modelo_usado'] = model_name
        results['fecha_prediccion'] = datetime.now()
        
        return results
    
    def predict_future(self, df: pd.DataFrame, numero_parte: str, days_ahead: int = 30) -> pd.DataFrame:
        """
        Predice demanda futura para un producto específico.
        """
        if not self.is_trained:
            raise ValueError("El modelo debe ser entrenado antes de hacer predicciones")
        
        # Filtrar datos del producto
        product_data = df[df['numero_parte'] == numero_parte].copy()
        
        if len(product_data) == 0:
            raise ValueError(f"No se encontraron datos para el número de parte: {numero_parte}")
        
        # Obtener última fecha
        last_date = product_data['fecha'].max()
        
        # Crear fechas futuras
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days_ahead,
            freq='D'
        )
        
        predictions = []
        
        for future_date in future_dates:
            # Crear registro para predicción
            future_record = product_data.iloc[-1:].copy()
            future_record['fecha'] = future_date
            
            # Combinar con datos históricos para calcular características
            extended_data = pd.concat([product_data, future_record], ignore_index=True)
            
            # Realizar predicción
            pred = self.predict(extended_data.tail(1), days_ahead=1)
            predictions.append({
                'numero_parte': numero_parte,
                'fecha': future_date,
                'prediccion_demanda': pred['prediccion_demanda'].iloc[0],
                'dias_adelante': (future_date - last_date).days
            })
        
        return pd.DataFrame(predictions)
    
    def save_model(self, filepath: str):
        """
        Guarda el modelo entrenado.
        """
        if not self.is_trained:
            raise ValueError("No hay modelo entrenado para guardar")
        
        model_data = {
            'models': self.models,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_columns': self.feature_columns,
            'feature_importance': self.feature_importance,
            'is_trained': self.is_trained
        }
        
        joblib.dump(model_data, filepath)
        logger.info(f"Modelo guardado en: {filepath}")
    
    def load_model(self, filepath: str):
        """
        Carga un modelo previamente entrenado.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"No se encontró el archivo: {filepath}")
        
        model_data = joblib.load(filepath)
        
        self.models = model_data['models']
        self.scaler = model_data['scaler']
        self.label_encoders = model_data['label_encoders']
        self.feature_columns = model_data['feature_columns']
        self.feature_importance = model_data['feature_importance']
        self.is_trained = model_data['is_trained']
        
        logger.info(f"Modelo cargado desde: {filepath}")
    
    def get_feature_importance(self, model_name: str = 'random_forest') -> Dict:
        """
        Retorna la importancia de las características.
        """
        if model_name in self.feature_importance:
            return self.feature_importance[model_name]
        return {}

# Funciones de utilidad para integración con API

def train_demand_model(csv_path: str) -> Dict:
    """
    Función de conveniencia para entrenar modelo desde CSV.
    """
    try:
        # Cargar datos
        df = pd.read_csv(csv_path)
        
        # Validar columnas requeridas
        required_columns = ['fecha', 'numero_parte', 'cantidad_vendida']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise ValueError(f"Faltan columnas requeridas: {missing_columns}")
        
        # Entrenar modelo
        predictor = DemandPredictor()
        results = predictor.train(df)
        
        # Guardar modelo
        model_path = 'models/demand_predictor.joblib'
        os.makedirs('models', exist_ok=True)
        predictor.save_model(model_path)
        
        return {
            'status': 'success',
            'message': 'Modelo entrenado exitosamente',
            'results': results,
            'model_path': model_path
        }
        
    except Exception as e:
        logger.error(f"Error entrenando modelo: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }

def predict_demand(numero_parte: str, days_ahead: int = 30) -> Dict:
    """
    Función de conveniencia para realizar predicciones.
    """
    try:
        predictor = DemandPredictor()
        model_path = 'models/demand_predictor.joblib'
        
        if not os.path.exists(model_path):
            raise FileNotFoundError("Modelo no encontrado. Entrene el modelo primero.")
        
        predictor.load_model(model_path)
        
        # Cargar datos históricos (esto debería venir de la base de datos)
        # Por ahora, asumimos que hay un CSV con datos históricos
        df = pd.read_csv('data/historical_data.csv')
        
        predictions = predictor.predict_future(df, numero_parte, days_ahead)
        
        return {
            'status': 'success',
            'predictions': predictions.to_dict('records')
        }
        
    except Exception as e:
        logger.error(f"Error realizando predicción: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        } 