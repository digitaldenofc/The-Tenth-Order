import os
import glob
import sys

# --- VERIFICAÇÃO DE DEPENDÊNCIA (FOOLPROOF) ---
try:
    # pyrefly: ignore [missing-import]
    from PIL import Image
except ImportError:
    print("==========================================================")
    print(" ERRO: A biblioteca 'Pillow' (PIL) não está instalada.")
    print("==========================================================")
    print("Para corrigir e rodar o otimizador, abra o seu terminal/PowerShell")
    print("e digite o seguinte comando:")
    print("\n    pip install Pillow\n")
    print("Após a instalação concluir, execute este script novamente.")
    print("==========================================================")
    input("Pressione Enter para fechar...")
    sys.exit(1)

def optimize_images():
    print("==================================================")
    print("   OTIMIZADOR DE IMAGENS - A DÉCIMA ORDEM")
    print("==================================================")
    
    # Caminho absoluto para a pasta imagens
    img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "imagens")
    
    if not os.path.exists(img_dir):
        print(f"Erro: A pasta '{img_dir}' não foi encontrada.")
        print(f"Ela deveria estar em: {img_dir}")
        input("Pressione Enter para fechar...")
        return
        
    png_files = glob.glob(os.path.join(img_dir, "*.png"))
    
    if not png_files:
        print("Nenhuma imagem PNG encontrada na pasta 'imagens'.")
        input("Pressione Enter para fechar...")
        return
        
    print(f"Encontradas {len(png_files)} imagens PNG para otimizar.")
    
    # Compatibilidade de versão do Pillow (LANCZOS vs ANTIALIAS)
    # Evita erros de AttributeError em versões muito antigas ou muito novas do Pillow
    resample_method = None
    try:
        # Versões modernas do Pillow (>= 9.1.0)
        resample_method = Image.Resampling.LANCZOS
    except AttributeError:
        try:
            # Versões antigas do Pillow
            resample_method = Image.ANTIALIAS
        except AttributeError:
            # Fallback seguro caso tudo falhe
            resample_method = Image.BICUBIC
            
    total_saved = 0
    optimized_count = 0
    
    for filepath in png_files:
        filename = os.path.basename(filepath)
        orig_size = os.path.getsize(filepath)
        orig_size_mb = orig_size / (1024 * 1024)
        
        # Ignora imagens que já estão otimizadas (menores que 300KB)
        if orig_size < 300 * 1024:
            print(f"[-] {filename} já está otimizado ({orig_size / 1024:.1f} KB). Pulando.")
            continue
            
        print(f"[*] Otimizando {filename} ({orig_size_mb:.2f} MB)...")
        
        try:
            # Abre a imagem
            with Image.open(filepath) as img:
                # Redimensiona mantendo a proporção (máximo de 360px de largura/altura)
                max_size = 360
                img.thumbnail((max_size, max_size), resample_method)
                
                # Salva de volta por cima da original com compressão otimizada
                img.save(filepath, "PNG", optimize=True)
                
            new_size = os.path.getsize(filepath)
            new_size_kb = new_size / 1024
            saved = orig_size - new_size
            total_saved += saved
            optimized_count += 1
            
            print(f"    [+] Concluído! Novo tamanho: {new_size_kb:.1f} KB (Redução de {saved / (1024 * 1024):.2f} MB)")
            
        except Exception as e:
            print(f"    [!] Erro ao processar {filename}: {e}")
            
    print("==================================================")
    print(f" Otimização finalizada!")
    print(f" Imagens otimizadas: {optimized_count}")
    print(f" Total economizado de espaço em disco: {total_saved / (1024 * 1024):.2f} MB")
    print(" Suas mídias estão prontas para subir ao GitHub de forma leve!")
    print("==================================================")
    input("Pressione Enter para fechar...")

if __name__ == "__main__":
    optimize_images()
