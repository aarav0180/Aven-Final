import os
import shutil

# Set the root directory to the current directory (Aven)
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


def remove_git_dirs(root_dir):
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Copy the list to avoid modifying while iterating
        for dirname in list(dirnames):
            if dirname == '.git':
                git_dir = os.path.join(dirpath, dirname)
                print(f"Removing: {git_dir}")
                shutil.rmtree(git_dir)
                dirnames.remove(dirname)  # Prevent descending into deleted dir

if __name__ == "__main__":
    remove_git_dirs(ROOT_DIR) 